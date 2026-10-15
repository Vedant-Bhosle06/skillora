# skillora-path-service

Python / FastAPI microservice that computes personalised learning paths over the Skillora skill graph (deliverable **D3**). It is an internal sidecar: only the Node API (`skillora-api`) calls it, never the browser.

**Owner:** Member A

- Loads `skills` and `prerequisite_of` edges from MongoDB into an in-memory `networkx.DiGraph` at startup (read-only; it never writes to the database).
- Runs an **A\* search over the state space** "set of skills learned so far" to find the minimum-effort, prerequisite-respecting path to a target role, plus up to `k − 1` near-optimal alternatives ranked by a composite score.
- Stateless and independently testable: callable with `curl` using only the `X-Internal-Key` header.

## Endpoints

All endpoints except `/health` require the header `X-Internal-Key: <INTERNAL_API_KEY>`. Interactive docs: `http://localhost:5001/docs`.

| ID | Method & path | Purpose |
|---|---|---|
| API-P-1 | `POST /compute/paths` | Primary path + ranked alternatives, with a rationale per step |
| API-P-3 | `GET /graph/metrics` | Graph health: node/edge counts, `isDAG`, cycle sample, orphans, average degree, roots, max depth |
| API-P-4 | `GET /health` | Liveness: `{ status, graphLoaded, nodes, edges }` (no key) |
| API-P-5 | `POST /graph/reload` | Re-read skills and edges from MongoDB (Node calls this after admin writes) |
| — | `POST /graph/validate-order` | Count prerequisite-order violations in a step list (used by `scripts/seed-eval.js`) |

### `POST /compute/paths`

Request (only `requirements` is needed; the rest have defaults):

```json
{
  "heldSkills":   [ { "skillId": "<ObjectId>", "rank": 1 } ],
  "requirements": [
    { "anyOf": ["<ObjectId>"], "minRank": 2, "label": "" },
    { "anyOf": ["<powerbi_id>", "<tableau_id>"], "minRank": 1, "label": "BI tool" }
  ],
  "k": 3,
  "alpha": 0.7,
  "beta": 0.3,
  "useHeuristic": true,
  "costBoundRatio": 1.5,
  "heuristic": "closure"
}
```

| Field | Default | Meaning |
|---|---|---|
| `heldSkills` | `[]` | Skills the user holds, rank 1 = beginner, 2 = intermediate, 3 = advanced |
| `requirements` | — | Role requirements; several `anyOf` ids = "any one of these" |
| `k` | 3 | Max paths returned (1–5) |
| `alpha`, `beta` | 0.7, 0.3 | Composite score weights |
| `useHeuristic` | `true` | `false` runs Dijkstra (same search, h = 0) |
| `costBoundRatio` | env `COST_BOUND_RATIO` (1.5) | Alternatives must cost ≤ ratio × the cheapest path |
| `heuristic` | `"closure"` | `"simple"` uses the spec's original heuristic |

Response:

```json
{
  "algorithm": "a_star",
  "stats": { "statesExpanded": 37, "statesToPrimary": 16, "elapsedMs": 2.1, "capped": false },
  "paths": [
    { "rank": 1, "type": "primary", "totalLearningCost": 60, "marketDemandAvg": 0.675, "compositeScore": 0.744,
      "steps": [ { "skillId": "<ObjectId>", "order": 1, "fromRank": 0, "toRank": 1, "estCost": 12.5,
                   "rationale": "Chosen for 'BI tool' ..." } ] }
  ]
}
```

`algorithm` is `a_star`, `dijkstra` or `greedy_fallback`. If the user already meets every requirement, one `primary` path with `steps: []` and cost 0 is returned.

### Status codes

| Code | When |
|---|---|
| 403 | Missing or wrong `X-Internal-Key` |
| 422 | Invalid body, or a requirement references an unknown skill id |
| 503 | Graph not loaded (MongoDB unreachable at startup) or reload failed (the previous graph is kept) |
| 500 | A computed path failed `validate_order()` (an internal bug guard; should never happen) |

## How the search works

1. **Held-skill rule.** A requirement is met if any option is held at rank ≥ `minRank`; a prerequisite is met at any rank ≥ 1. Unmet requirements' options plus their unknown prerequisite ancestors form the relevant set.
2. **Step cost** = `estHours × (toRank − fromRank) / 2`.
3. **A\*** over sets of learned skills: a move learns one unlocked skill (all mandatory prerequisites known and ≥ 1 per OR-group); the goal is "every requirement met".
4. **Heuristic** (`closure`, default): cost of every skill that *any* solution must learn — the single-option requirements plus their mandatory prerequisite closure. Admissible and consistent, so goals come out cheapest-first. `simple` counts only the single-option requirements (the spec's heuristic).
5. **Alternatives.** Goal states that are strict supersets of an earlier goal are discarded; the search stops after `3k` goals or once costs exceed `costBoundRatio ×` the cheapest. Paths are ranked by `α·(cost / maxCost) + β·(1 − marketDemandAvg)` (lower is better).
6. **Ordering & validation.** Steps are ordered by a lexicographic topological sort (cheapest first on ties) and every path is checked by `validate_order()`.
7. **Safety cap.** After `MAX_STATES` expansions the search stops: it returns the goals already found (`stats.capped: true`), or a greedy cost-aware path (`greedy_fallback`) if none were found.

Moves that cannot lead to an unmet requirement are pruned (this keeps every minimal goal reachable). See `docs/D6_Evaluation_Report.md` §10 for the reasoning behind these refinements.

## Setup

Requires Python ≥ 3.11 (tested on 3.14). Dependency ranges are bounded below the next major version.

```bash
cd skillora-path-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
```

Create `skillora-path-service/.env` from the `[PYTHON SERVICE]` section of `../.env.example`:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MONGO_URI` | yes | — | Same value as the Node API |
| `INTERNAL_API_KEY` | yes | — | Same value as the Node API; the service refuses to start without it |
| `PYTHON_PORT` | no | 5001 | Port used in the uvicorn command |
| `MONGO_DB` | no | database in the URI | Override the database name |
| `SKILLS_COLLECTION` | no | `skills` | |
| `EDGES_COLLECTION` | no | `skill_edges` | Pinned in the `SkillEdge` Mongoose model (matches the spec) |
| `MAX_STATES` | no | 200000 | Search safety cap |
| `COST_BOUND_RATIO` | no | 1.5 | Default near-optimal bound for alternatives |

The database must be seeded first (`node scripts/seed.js` from the repo root).

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

```bash
curl http://localhost:5001/health
```

```bash
curl -X POST http://localhost:5001/compute/paths \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: <INTERNAL_API_KEY>" \
  -d '{"heldSkills": [], "requirements": [{"anyOf": ["<skillId>"], "minRank": 2}]}'
```

## Tests

```bash
pytest tests/ -v --cov=. --cov-report=term-missing
```

Tests use in-memory fixture graphs, so MongoDB does not need to be running. Coverage must stay ≥ 80% (enforced by `pytest.ini` / `.coveragerc`). The tests include the spec's worked example (Data Analyst: 60 h primary vs 65 h alternative, and the α/β ranking flip) and brute-force admissibility/consistency checks of both heuristics.

## Dataset QA

```bash
python -m tools.check_dataset --data ../data/v1
```

Loads `data/v1/*.json` directly (no MongoDB), prints the graph metrics, runs every role from an empty profile with A\* (closure and simple heuristics) and Dijkstra, flags any role that hits the cap, is slow or offers only one route, and re-checks the worked example on the real data.

## Layout

```
main.py           FastAPI app factory, routes, X-Internal-Key check
config.py         environment settings
graph_loader.py   GraphStore; build from MongoDB or data/v1 JSON
search.py         A* / Dijkstra search, greedy fallback, ranking, ordering, rationales
validate.py       validate_order()
models.py         Pydantic request/response models
tests/            pytest suite (fixture graphs)
tools/            dataset QA + stress check
```
