"""Builds skillora-client/src/content/landing-graph.json for the homepage hero.

The public homepage cannot call /api/graph (it needs a session), so it ships a snapshot of the
real dataset: every skill with a 3D position, the prerequisite and corequisite links, and the
Data Analyst route the A* engine computes from Python (beginner) + SQL (intermediate).

Run from the repo root after changing data/v1:
    skillora-path-service/.venv/bin/python scripts/build-landing-graph.py
"""
import json
import math
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "skillora-path-service"))

import networkx as nx  # noqa: E402
from graph_loader import load_from_json  # noqa: E402
from search import Requirement, compute_paths  # noqa: E402

DATA = ROOT / "data" / "v1"
OUT = ROOT / "skillora-client" / "src" / "content" / "landing-graph.json"
RANK = {"beginner": 1, "intermediate": 2, "advanced": 3}
HELD = {"python": 1, "sql": 2}
ROLE = "data-analyst"

skills = json.loads((DATA / "skills.json").read_text())
edges = json.loads((DATA / "edges.json").read_text())
role = next(r for r in json.loads((DATA / "roles.json").read_text()) if r["slug"] == ROLE)

# The real route, from the same engine the API uses.
store = load_from_json(DATA)
reqs = [Requirement(r["anyOf"], RANK[r["minProficiency"]], r.get("label") or "") for r in role["requiredSkills"]]
result = compute_paths(store, HELD, reqs)
primary = result["paths"][0]
route = [s["skillId"] for s in primary["steps"]]

def force_layout_3d(graph: nx.Graph, seed: int = 7, iterations: int = 400, k: float = 0.32) -> dict:
    """Fruchterman–Reingold in 3D, pure Python (no numpy), seeded so the snapshot is stable."""
    rnd = random.Random(seed)
    nodes_ = list(graph.nodes)
    p = {n: [rnd.uniform(-1, 1) for _ in range(3)] for n in nodes_}
    temp = 0.1
    for _ in range(iterations):
        disp = {n: [0.0, 0.0, 0.0] for n in nodes_}
        for i, a in enumerate(nodes_):
            for b in nodes_[i + 1:]:
                d = [p[a][t] - p[b][t] for t in range(3)]
                dist = max(math.sqrt(sum(x * x for x in d)), 1e-4)
                f = k * k / dist
                for t in range(3):
                    disp[a][t] += d[t] / dist * f
                    disp[b][t] -= d[t] / dist * f
        for a, b in graph.edges:
            d = [p[a][t] - p[b][t] for t in range(3)]
            dist = max(math.sqrt(sum(x * x for x in d)), 1e-4)
            f = dist * dist / k
            for t in range(3):
                disp[a][t] -= d[t] / dist * f
                disp[b][t] += d[t] / dist * f
        for n in nodes_:
            length = max(math.sqrt(sum(x * x for x in disp[n])), 1e-4)
            for t in range(3):
                p[n][t] += disp[n][t] / length * min(length, temp)
                p[n][t] -= p[n][t] * 0.01  # weak pull to the centre keeps loose nodes in frame
        temp *= 0.992
    return p


g = nx.Graph()
g.add_nodes_from(s["slug"] for s in skills)
g.add_edges_from((e["sourceSkillId"], e["targetSkillId"]) for e in edges)
pos = force_layout_3d(g)
centre = pos["python"]  # the camera starts on the skill the visitor already knows
scale = 10.0

index = {s["slug"]: i for i, s in enumerate(skills)}
nodes = [{
    "slug": s["slug"], "name": s["name"], "category": s["category"],
    "p": [round(float((pos[s["slug"]][k] - centre[k]) * scale), 3) for k in range(3)],
    "degree": g.degree(s["slug"]),
} for s in skills]

out = {
    "nodes": nodes,
    # [source, target, 1 = prerequisite / 0 = corequisite, either-or group name or ""]
    "edges": [[index[e["sourceSkillId"]], index[e["targetSkillId"]], 1 if e["type"] == "prerequisite_of" else 0, e.get("group") or ""] for e in edges],
    "held": [{"slug": k, "rank": v} for k, v in HELD.items()],
    "role": {"slug": role["slug"], "title": role["title"]},
    "route": [{"slug": s["skillId"], "name": store.names[s["skillId"]], "estCost": s["estCost"],
               "fromRank": s["fromRank"], "toRank": s["toRank"], "rationale": s["rationale"]} for s in primary["steps"]],
    "totalHours": primary["totalLearningCost"],
    "alternativeHours": result["paths"][1]["totalLearningCost"] if len(result["paths"]) > 1 else None,
    "statesToPrimary": result["stats"]["statesToPrimary"],
}
# Skills the visitor could start right now: not held, with every mandatory prerequisite held and
# at least one member of each either-or group held (the same rule the search uses), and at least
# one prerequisite at all (roots are open to everyone and say nothing about this profile).
known = {s for s, r in HELD.items() if r >= 1}
out["readyNow"] = sorted(
    sid for sid in store.names
    if sid not in known
    and (store.mandatory[sid] or store.groups[sid])
    and store.mandatory[sid] <= known
    and all(members & known for members in store.groups[sid].values())
)

# Every role with its requirements (either-or options and minimum level), for role details.
out["roles"] = [{
    "slug": r["slug"], "title": r["title"], "category": r["category"], "demandScore": r["demandScore"],
    "requirements": [{"label": q.get("label") or "", "level": q["minProficiency"],
                      "options": [store.names[o] for o in q["anyOf"]]} for q in r["requiredSkills"]],
} for r in json.loads((DATA / "roles.json").read_text())]

# Facts for the bento tiles: both Data Analyst routes, search effort, and the D6 evaluation.
ml_role = next(r for r in json.loads((DATA / "roles.json").read_text()) if r["slug"] == "machine-learning-engineer")
ml_reqs = [Requirement(r["anyOf"], RANK[r["minProficiency"]], r.get("label") or "") for r in ml_role["requiredSkills"]]
ml_held = {"python": 2, "statistics": 1}
ml_a = compute_paths(store, ml_held, ml_reqs)
ml_d = compute_paths(store, ml_held, ml_reqs, use_heuristic=False)
ev = json.loads((ROOT / "docs" / "evaluation" / "results.json").read_text())["scenarios"]
worked = ev[1]["metrics"]
# The generic roadmap from the D6 evaluation (worked example), each step costed from zero at the
# level the role asks for (prerequisites at beginner), the same rule the evaluation used.
level = {o: RANK[q["minProficiency"]] for q in role["requiredSkills"] for o in q["anyOf"]}
baseline = [{"name": store.names[sid], "hours": store.est_hours[sid] * level.get(sid, 1) / 2}
            for sid in ev[1]["paths"]["baselinePath"]]
assert abs(sum(x["hours"] for x in baseline) - worked["baselineHours"]) < 1e-6, baseline

out["facts"] = {
    "baseline": baseline,
    "routes": [{"hours": p["totalLearningCost"], "score": p["compositeScore"], "demand": p["marketDemandAvg"],
                "via": [store.names[s["skillId"]] for s in p["steps"] if s["skillId"] in ("tableau", "excel", "power-bi")]}
               for p in result["paths"][:2]],
    "search": {"role": ml_role["title"], "astar": ml_a["stats"]["statesToPrimary"], "dijkstra": ml_d["stats"]["statesToPrimary"]},
    "evaluation": {
        "workedSavedPct": worked["timeSavedPct"], "workedBaselineHours": worked["baselineHours"],
        "meanSavedPct": round(sum(s["metrics"]["timeSavedPct"] for s in ev) / len(ev), 2),
        "worstShuffledViolations": max(s["metrics"]["baselineOrderViolations"] for s in ev),
        "profiles": len(ev),
    },
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, separators=(",", ":")))
print(f"wrote {OUT.relative_to(ROOT)}: {len(nodes)} nodes, {len(out['edges'])} edges, route {route}, {out['totalHours']} h")
