"""FastAPI entry point for the Skillora path-computation service."""
from __future__ import annotations

import logging
import secrets
from contextlib import asynccontextmanager
from typing import Callable, Optional

import networkx as nx
from fastapi import Depends, FastAPI, Header, HTTPException, Request

import config
from graph_loader import GraphStore, load_from_mongo_uri
from models import ComputeRequest, ComputeResponse, ValidateOrderRequest, ValidateOrderResponse
from validate import validate_order
from search import PathValidationError, Requirement, UnknownSkillError, compute_paths

log = logging.getLogger("path-service")


def create_app(loader: Optional[Callable[[], GraphStore]] = None, api_key: Optional[str] = None,
               max_states: Optional[int] = None) -> FastAPI:
    """App factory. `loader` builds a GraphStore (Mongo by default; fixtures in tests)."""
    key = api_key if api_key is not None else config.internal_api_key()
    if not key:
        raise RuntimeError("INTERNAL_API_KEY is not set; refusing to start")
    load = loader or load_from_mongo_uri

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            app.state.store = load()
        except Exception:  # Mongo down etc.: start empty, /compute answers 503
            log.exception("Graph load failed at startup; starting with an empty graph")
            app.state.store = GraphStore()
        yield

    app = FastAPI(title="Skillora Path Service", lifespan=lifespan)
    app.state.api_key = key
    app.state.store = GraphStore()
    app.state.max_states = max_states if max_states is not None else config.max_states()
    app.state.cost_bound_ratio = config.cost_bound_ratio()

    def require_key(request: Request, x_internal_key: Optional[str] = Header(default=None)) -> None:
        """Shared-secret check applied to every route except /health."""
        if not x_internal_key or not secrets.compare_digest(x_internal_key, request.app.state.api_key):
            raise HTTPException(status_code=403, detail="Forbidden")

    def loaded_store(request: Request) -> GraphStore:
        store: GraphStore = request.app.state.store
        if not store.loaded:
            raise HTTPException(status_code=503, detail="Graph not loaded")
        return store

    @app.get("/health")
    def health(request: Request) -> dict:
        store: GraphStore = request.app.state.store
        return {"status": "ok", "graphLoaded": store.loaded,
                "nodes": store.graph.number_of_nodes(), "edges": store.graph.number_of_edges()}

    @app.post("/compute/paths", response_model=ComputeResponse, dependencies=[Depends(require_key)])
    def compute(body: ComputeRequest, request: Request, store: GraphStore = Depends(loaded_store)) -> dict:
        held: dict[str, int] = {}
        for h in body.heldSkills:
            held[h.skillId] = max(held.get(h.skillId, 0), h.rank)
        reqs = [Requirement(r.anyOf, r.minRank, r.label or "") for r in body.requirements]
        try:
            return compute_paths(store, held, reqs, k=body.k, alpha=body.alpha, beta=body.beta,
                                 use_heuristic=body.useHeuristic, heuristic=body.heuristic or "closure",
                                 max_states=request.app.state.max_states,
                                 cost_bound_ratio=(body.costBoundRatio if body.costBoundRatio is not None
                                                   else request.app.state.cost_bound_ratio))
        except UnknownSkillError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except PathValidationError as e:
            log.error("%s", e)
            raise HTTPException(status_code=500, detail="Computed path failed order validation")

    @app.get("/graph/metrics", dependencies=[Depends(require_key)])
    def metrics(store: GraphStore = Depends(loaded_store)) -> dict:
        g = store.graph
        n = g.number_of_nodes()
        is_dag = nx.is_directed_acyclic_graph(g)
        cycle = None
        if not is_dag:
            cycle = [u for u, _ in nx.find_cycle(g)]
        orphans = sorted(x for x in g if g.degree(x) == 0)
        return {
            "nodeCount": n,
            "prerequisiteEdgeCount": g.number_of_edges(),
            "corequisiteEdgeCount": store.corequisite_edge_count,
            "groupCount": store.group_count,
            "isDAG": is_dag,
            "cycle": cycle,
            "orphanCount": len(orphans),
            "orphans": [{"skillId": x, "name": store.names[x]} for x in orphans],
            "avgDegree": round(2 * g.number_of_edges() / n, 3),
            "roots": sorted(x for x in g if g.in_degree(x) == 0 and g.out_degree(x) > 0),
            "maxDepth": nx.dag_longest_path_length(g) if is_dag else None,
        }

    @app.post("/graph/reload", dependencies=[Depends(require_key)])
    def reload(request: Request) -> dict:
        try:
            new_store = load()
        except Exception:
            log.exception("Graph reload failed; keeping the previous graph")
            raise HTTPException(status_code=503, detail="Could not reload graph")
        request.app.state.store = new_store  # single assignment; in-flight requests keep the old store
        return {"status": "reloaded", "nodes": new_store.graph.number_of_nodes(),
                "edges": new_store.graph.number_of_edges()}

    @app.post("/graph/validate-order", response_model=ValidateOrderResponse,
              dependencies=[Depends(require_key)])
    def validate(body: ValidateOrderRequest, store: GraphStore = Depends(loaded_store)) -> dict:
        held = {h.skillId: h.rank for h in body.heldSkills}
        try:
            found = validate_order(body.steps, held, store)
        except KeyError as e:
            raise HTTPException(status_code=422, detail=f"Unknown skill id: {e.args[0]}")
        return {"violations": len(found), "details": [v.to_dict() for v in found]}

    return app


def __getattr__(name: str):
    """Lazily build `app` so `uvicorn main:app` works without import-time env requirements."""
    if name == "app":
        global app
        app = create_app()
        return app
    raise AttributeError(name)
