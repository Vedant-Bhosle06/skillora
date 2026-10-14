"""Build the in-memory skill graph from MongoDB documents or the JSON dataset."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

import networkx as nx

import config

log = logging.getLogger(__name__)

PREREQ = "prerequisite_of"
COREQ = "corequisite_with"
DEFAULT_DIFFICULTY = 3


@dataclass
class GraphStore:
    """Immutable-by-convention snapshot of the skill graph plus lookup tables."""

    graph: nx.DiGraph = field(default_factory=nx.DiGraph)
    names: dict[str, str] = field(default_factory=dict)
    slugs: dict[str, str] = field(default_factory=dict)
    est_hours: dict[str, float] = field(default_factory=dict)
    demand: dict[str, float] = field(default_factory=dict)
    mandatory: dict[str, set[str]] = field(default_factory=dict)
    groups: dict[str, dict[str, set[str]]] = field(default_factory=dict)
    coreq: dict[str, set[str]] = field(default_factory=dict)
    corequisite_edge_count: int = 0

    @property
    def loaded(self) -> bool:
        return self.graph.number_of_nodes() > 0

    @property
    def group_count(self) -> int:
        return sum(len(g) for g in self.groups.values())


def build_graph(skills: Iterable[dict[str, Any]], edges: Iterable[dict[str, Any]]) -> GraphStore:
    """Pure builder. Node ids are str(_id) (Mongo) or the slug (fixtures / JSON)."""
    store = GraphStore()
    g = store.graph
    for s in skills:
        sid = str(s["_id"] if "_id" in s else s["slug"])
        hours = s.get("estHours")
        if hours is None:
            hours = s.get("baseDifficulty", DEFAULT_DIFFICULTY) * 8
        g.add_node(sid, slug=s.get("slug", sid), name=s.get("name", sid),
                   estHours=float(hours), marketDemand=float(s.get("marketDemand", 0.5)))
        store.names[sid] = s.get("name", sid)
        store.slugs[sid] = s.get("slug", sid)
        store.est_hours[sid] = float(hours)
        store.demand[sid] = float(s.get("marketDemand", 0.5))
        store.mandatory[sid] = set()
        store.groups[sid] = {}
        store.coreq[sid] = set()

    for e in edges:
        src, dst = str(e["sourceSkillId"]), str(e["targetSkillId"])
        if src not in g or dst not in g:
            log.warning("Skipping edge with unknown endpoint: %s -> %s", src, dst)
            continue
        if e.get("type") == COREQ:
            store.coreq[src].add(dst)
            store.coreq[dst].add(src)
            store.corequisite_edge_count += 1
            continue
        if e.get("type") != PREREQ:
            continue
        g.add_edge(src, dst, group=e.get("group"))
        if e.get("group"):
            store.groups[dst].setdefault(e["group"], set()).add(src)
        else:
            store.mandatory[dst].add(src)
    return store


def load_from_mongo(db: Any, skills_collection: str | None = None,
                    edges_collection: str | None = None) -> GraphStore:
    """Read skills + edges from a pymongo-like database object."""
    skills = list(db[skills_collection or config.skills_collection()].find())
    edges = list(db[edges_collection or config.edges_collection()].find())
    return build_graph(skills, edges)


def load_from_mongo_uri() -> GraphStore:
    """Default production loader: connect, read, close."""
    from pymongo import MongoClient

    client = MongoClient(config.mongo_uri(), serverSelectionTimeoutMS=5000)
    try:
        db = client[config.mongo_db()] if config.mongo_db() else client.get_default_database()
        return load_from_mongo(db)
    finally:
        client.close()


def load_from_json(data_dir: str | Path) -> GraphStore:
    """Load data/v1-style JSON (edge keys hold slugs); used by QA tools and tests."""
    d = Path(data_dir)
    skills = json.loads((d / "skills.json").read_text())
    edges = json.loads((d / "edges.json").read_text())
    return build_graph(skills, edges)
