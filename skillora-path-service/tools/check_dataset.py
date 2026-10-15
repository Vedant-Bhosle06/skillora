"""Dataset QA + stress check: python -m tools.check_dataset --data ../data/v1"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import networkx as nx

from graph_loader import load_from_json
from search import Requirement, compute_paths

RANKS = {"beginner": 1, "intermediate": 2, "advanced": 3}


def role_requirements(role: dict) -> list[Requirement]:
    return [Requirement(r["anyOf"], RANKS[r["minProficiency"]], r.get("label") or "")
            for r in role["requiredSkills"]]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(Path(__file__).resolve().parents[2] / "data" / "v1"))
    ap.add_argument("--max-states", type=int, default=200_000)
    args = ap.parse_args(argv)

    store = load_from_json(args.data)
    roles = json.loads((Path(args.data) / "roles.json").read_text())
    g = store.graph
    print(f"nodes={g.number_of_nodes()} prereqEdges={g.number_of_edges()} coreqEdges={store.corequisite_edge_count} "
          f"groups={store.group_count} isDAG={nx.is_directed_acyclic_graph(g)} "
          f"orphans={sum(1 for n in g if g.degree(n) == 0)}")

    flags = []
    print(f"{'role':30}{'paths':>6} | {'closure':>16} | {'simple':>16} | {'dijkstra':>16} | {'closure'}")
    print(f"{'':30}{'':>6} | {'toPrim':>8}{'total':>8} | {'toPrim':>8}{'total':>8} | {'toPrim':>8}{'total':>8} | {'ms':>6}  capped")
    for role in roles:
        reqs = role_requirements(role)
        row = {}
        for mode, kw in (("c", dict(heuristic="closure")), ("s", dict(heuristic="simple")),
                         ("d", dict(use_heuristic=False))):
            t0 = time.perf_counter()
            out = compute_paths(store, {}, reqs, max_states=args.max_states, **kw)
            row[mode] = (out, (time.perf_counter() - t0) * 1000)
        c, cms = row["c"]
        s, _ = row["s"]
        d, _ = row["d"]
        capped = any(x["stats"]["capped"] for x in (c, s, d))

        def st(o):
            return f"{str(o['stats']['statesToPrimary']):>8}{o['stats']['statesExpanded']:>8}"
        print(f"{role['slug']:30}{len(c['paths']):>6} | {st(c)} | {st(s)} | {st(d)} | {cms:>6.0f}  {capped}")
        if capped or cms > 1000 or len(c["paths"]) < 2:
            flags.append(role["slug"])

    da = next(r for r in roles if r["slug"] == "data-analyst")
    out = compute_paths(store, {"python": 1, "sql": 2}, role_requirements(da))
    costs = [p["totalLearningCost"] for p in out["paths"]][:2]
    ok = costs == [60, 65]
    print(f"worked example on real data: {costs} {'OK' if ok else 'MISMATCH'}")
    if flags:
        print("flagged (capped / >1s / single route):", ", ".join(flags))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
