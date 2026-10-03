# SKILLORA — Team Work Division
### Based on Project Specification v4.0 · 3 Members

> **Context:** The Figma design is done and the UI codebase is already running.
> Member C therefore focuses on **API integration + targeted UI work** rather than building pages from scratch.
> Since individual commits are evaluated, this document maps every piece of work to **concrete, commit-sized tasks**.

---

## 🗂️ Summary Table

| | Member A | Member B | Member C |
|---|---|---|---|
| **Theme** | Data Curator + Algorithm Engineer | Node.js Backend Engineer | React Frontend Integrator |
| **Deliverables** | D1, D3, D6 | D2 (backend), D7 (API docs) | D2 (frontend), D4, D5, D7 (user guide) |
| **Core Tech** | Python, FastAPI, NetworkX, heapq | Node.js, Express, Mongoose, JWT | React, Axios/Fetch, react-force-graph |
| **Commit load** | Heavy (algorithm is complex) | Heaviest (31 endpoints) | Moderate (integration + 2 core UI features) |

---

---

## 👤 Member A — Data Curator + Python Algorithm Engineer

> **Owns:** D1 (skill graph dataset), D3 (Python microservice), D6 (evaluation report + seed script)

---

### Phase 1 — Curate the Skill Graph Dataset (D1)

This is the most research-intensive work. Everything else depends on having this data in MongoDB.

**What to produce:**

| File | Contents |
|---|---|
| `data/v1/skills.json` | 80–120 skill nodes |
| `data/v1/edges.json` | ≥150 `prerequisite_of` edges + some `corequisite_with` |
| `data/v1/roles.json` | 15–20 role definitions |

**Each skill node must have:**
- `slug` (e.g. `"python-pandas"`), `name`, `category`, `description`, `aliases[]`
- `baseDifficulty` (1–5), `estHours` (hours from zero to intermediate; default = `baseDifficulty × 8`)
- `marketDemand` (0.0–1.0) — sample 20–30 job postings per track on LinkedIn/Naukri/Indeed

**Pick 3 career tracks** (e.g., Data/ML, Web Dev, Cloud/DevOps) and cover each with 25–40 skills.

**Each edge must have:**
- `sourceSkillId` (slug, resolved to ObjectId by seed script), `targetSkillId`, `type`
- `group` (string or null) — edges into the same target sharing the same group = "any one of these"
- `source` (curation note — e.g., `"roadmap.sh/python"`)

**Each role must have:**
- `slug`, `title`, `description`, `category`, `demandScore`
- `requiredSkills[]` — each entry: `{ anyOf: [slugs], minProficiency, label? }`
  - Single-element `anyOf` = mandatory. Multi-element = OR-choice (needed for alt paths!)
- **Every role must have ≥ 1 OR-choice** (D1 acceptance criterion)

**Sources:** roadmap.sh, Coursera/edX/NPTEL syllabi, LinkedIn/Naukri job postings, expert judgment.

**Commit plan:**
```
feat(data): add skills.json – Data/ML track (40 nodes)
feat(data): add skills.json – Web Dev track (40 nodes)  
feat(data): add skills.json – Cloud/DevOps track (30 nodes)
feat(data): add edges.json – prerequisite + corequisite edges
feat(data): add roles.json – 18 role definitions with OR-choices
feat(scripts): add seed.js – reads JSON, checks acyclic, upserts to MongoDB
```

**`scripts/seed.js` must:**
1. Read the three JSON files
2. Resolve slug references to ObjectIds
3. Verify the `prerequisite_of` subgraph is acyclic (`networkx`-style BFS, or just check for back-edges)
4. Upsert all documents into MongoDB (idempotent — safe to re-run)

---

### Phase 2 — Python FastAPI Microservice (D3)

Build `skillora-path-service` as a **separate Python app** on its own port.

**File structure:**
```
skillora-path-service/
├── main.py               ← FastAPI app, startup graph load
├── graph_loader.py       ← loads skills + skill_edges from MongoDB into networkx.DiGraph
├── search.py             ← A* state-space search + Dijkstra mode + greedy fallback
├── validate.py           ← validate_order() function
├── models.py             ← Pydantic request/response models
├── tests/
│   ├── fixtures.py       ← small in-memory fixture graphs (no MongoDB)
│   ├── test_search.py    ← A*, Dijkstra, greedy fallback, validate_order
│   └── test_api.py       ← FastAPI TestClient on fixture graphs
└── requirements.txt
```

**Endpoints to implement:**

| ID | Endpoint | Method | What to do |
|---|---|---|---|
| **API-P-1** | `/compute/paths` | POST | Full A* state-space search (see below) |
| **API-P-3** | `/graph/metrics` | GET | Orphan count, is_directed_acyclic_graph, avg degree on `prerequisite_of` subgraph |
| **API-P-4** | `/health` | GET | `{ "status": "ok" }` — no auth required |
| **API-P-5** | `/graph/reload` | POST | Re-read skills + edges from MongoDB into memory |

**All endpoints except `/health` require header `X-Internal-Key: <INTERNAL_API_KEY>`.**

**API-P-1 request body:**
```json
{
  "heldSkills": [ { "skillId": "<ObjectId>", "rank": 2 } ],
  "requirements": [
    { "anyOf": ["<skillId>"], "minRank": 2 },
    { "anyOf": ["<tableau_id>", "<powerbi_id>"], "minRank": 1, "label": "BI tool" }
  ],
  "k": 3,
  "alpha": 0.7,
  "beta": 0.3,
  "useHeuristic": true
}
```

**API-P-1 algorithm (implement this precisely, per spec §4.3):**

1. Load `prerequisite_of` edges only into `networkx.DiGraph` (at startup, kept in memory)
2. Apply held-skill rule: requirement met if any `anyOf` option is held at rank ≥ `minRank`; prerequisite met if held at rank ≥ 1
3. Find relevant skills `R` = unmet options + their `networkx.ancestors`, minus already-known skills
4. Target rank per skill: `minRank` if the skill is an OR-option of a requirement; else 1 (prerequisite)
5. Step cost = `estHours(s) × (targetRank − heldRank) / 2`
6. **A\* state-space search** (custom `heapq` — `networkx.astar_path` does not work for state spaces):
   - State = frozenset of skill slugs/ids learned so far in this plan
   - Move = learn one unlocked skill (all mandatory prereqs known + ≥1 from each group)
   - Goal = every requirement met
   - Heuristic `h` = sum of costs of unmet **single-option** requirements (admissible + consistent)
   - Dijkstra mode (`useHeuristic: false`) = same code, `h = 0`
   - Cap at **200,000 expanded states** → greedy fallback
7. Collect goal states (cheapest-first); discard strict supersets of already-found goal sets; take top `k`
8. Score: `compositeScore = α·(cost / maxCost) + β·(1 − marketDemandAvg)`; sort ascending
9. Order steps: `networkx.lexicographical_topological_sort` on induced prereq subgraph, tie-break by lower `estCost`
10. Run `validate_order()` on every path before returning

**API-P-1 response:**
```json
{
  "algorithm": "a_star",
  "stats": { "statesExpanded": 412, "elapsedMs": 38 },
  "paths": [
    {
      "rank": 1, "type": "primary",
      "totalLearningCost": 60, "marketDemandAvg": 0.675, "compositeScore": 0.744,
      "steps": [
        { "skillId": "<ObjectId>", "order": 1, "fromRank": 0, "toRank": 1,
          "estCost": 12.5, "rationale": "Chosen for 'BI tool' (5h cheaper than Excel → Power BI)" }
      ]
    }
  ]
}
```

**pytest unit tests (≥80% coverage):**
- Test A* on the worked example from the spec (Data Analyst, user holds Python:beginner + SQL:intermediate)
- Test that Plan A (Tableau route, 60h) scores better than Plan B (Excel→PowerBI, 65h) with default α/β
- Test that α=0.4, β=0.6 flips the ranking
- Test `validate_order()` — pass on a valid topological order, fail on a violation
- Test Dijkstra mode produces same goal states but may expand more states
- Test greedy fallback is triggered at the 200,000 state cap (use a fixture that forces it)
- All tests use in-memory fixture graphs — **no MongoDB connection needed**

**Commit plan:**
```
feat(python): scaffold FastAPI app with health endpoint and X-Internal-Key middleware
feat(python): add graph_loader.py – load networkx.DiGraph from MongoDB at startup
feat(python): add search.py – A* state-space search with heapq
feat(python): add search.py – Dijkstra mode (useHeuristic: false)
feat(python): add search.py – greedy fallback at 200k state cap
feat(python): add validate.py – validate_order() check
feat(python): add /compute/paths endpoint (API-P-1) with composite ranking
feat(python): add /graph/metrics (API-P-3) and /graph/reload (API-P-5)
test(python): unit tests for A*, Dijkstra, validate_order, greedy fallback
test(python): FastAPI TestClient integration tests on fixture graphs
```

---

### Phase 3 — Evaluation Report (D6)

Write `scripts/seed-eval.js` (Node.js script, **not** part of the live app).

**Define ≥5 scenarios, e.g.:**
| # | currentSkills | targetRole |
|---|---|---|
| 1 | nothing | Data Analyst |
| 2 | Python:beginner + SQL:intermediate | Data Analyst |
| 3 | Python:intermediate + Statistics:beginner | ML Engineer |
| 4 | HTML/CSS + JavaScript:beginner | Full Stack Developer |
| 5 | Linux:beginner + Git:beginner | DevOps Engineer |

**For each scenario:**
1. Call API-P-1 with `useHeuristic: true` → capture `systemPath` + `statesExpandedAStar`
2. Call API-P-1 with `useHeuristic: false` → capture `statesExpandedDijkstra`
3. Hard-code the `humanExpertPath` (what you'd tell a friend)
4. Build the `baselinePath` = all required skills (first `anyOf` option) + all prerequisites, from zero
5. Compute metrics:
   - `timeSavedPct = (baselineHours − systemHours) / baselineHours × 100`
   - `redundantSkillsAvoided` = baseline skills the user already holds
   - `systemOrderViolations` = 0 (check with `validate_order()`)
   - `baselineOrderViolations` = mean over 20 random shuffles of baseline
   - `expertJaccard` = `|system ∩ expert| / |system ∪ expert|`
   - `expertKendallTau` = order agreement on shared skills
6. Upsert into `evaluation_scenarios` (DB-6)

**Then write the D6 report** (markdown/PDF) with:
- Metrics table across all 5 scenarios
- Discussion of time saved vs. baseline (reference worked example: 47.8% saved)
- A* vs. Dijkstra states expanded (shows heuristic value)
- Limitations of static `marketDemand` curation and scaling discussion

**Commit plan:**
```
feat(scripts): add seed-eval.js – 5 evaluation scenarios with metrics
feat(scripts): seed-eval.js – A*/Dijkstra both modes, baseline generation
feat(scripts): seed-eval.js – upsert to evaluation_scenarios (DB-6)
docs(d6): evaluation report – metrics table and analysis
```

---

### Interfaces Member A Must Provide

| Gives to | What |
|---|---|
| **Member B** | `data/v1/*.json` files + working `scripts/seed.js` so Member B can populate the DB before testing any API |
| **Member B** | Python service URL + `INTERNAL_API_KEY` value (coordinate via `.env.example`) |
| **Member C** | List of skill slugs and role slugs so the frontend typeahead actually returns data |

---

---

## 👤 Member B — Node.js / Express Backend Engineer

> **Owns:** All 31 `API-N-*` endpoints, Mongoose schemas, auth, staleness logic, admin CRUD (D2 backend), OpenAPI docs (D7)

---

### Phase 1 — Project Setup & Database Schemas

```
feat(backend): init Express app, MongoDB connection, env config
feat(backend): Mongoose schema – users (DB-1) with all fields and indexes
feat(backend): Mongoose schema – skills (DB-2) with slug unique index + text index
feat(backend): Mongoose schema – skill_edges (DB-3) with compound unique index
feat(backend): Mongoose schema – roles (DB-4)
feat(backend): Mongoose schema – computed_paths (DB-5) with {userId, status} index + {userId, generatedAt:-1} index
feat(backend): Mongoose schema – evaluation_scenarios (DB-6)
feat(backend): Mongoose schema – sessions (DB-7) with tokenHash unique index + TTL index on expiresAt
feat(backend): auth middleware – JWT verify + session exists check in DB-7
feat(backend): admin middleware – users.role === "admin" guard
```

**Key schema details to get right:**
- `users.completedSkills[]` must store `proficiency`, `targetRoleId`, `fromPathId`
- `skills.estHours` defaults to `baseDifficulty × 8` when omitted
- `skill_edges.group` is string | null (only on `prerequisite_of` type)
- `computed_paths.status` ∈ `"active" | "stale" | "archived"`
- `sessions` TTL index: `{ expiresAt: 1 }` with `expireAfterSeconds: 0`

---

### Phase 2 — Auth Routes (P2)

```
feat(auth): POST /api/auth/register (API-N-2) – bcrypt hash, write users
feat(auth): POST /api/auth/login (API-N-3) – verify, issue JWT, write session
feat(auth): POST /api/auth/logout (API-N-28) – delete session from DB-7
feat(auth): rate-limit /register + /login to ≤10 req/min per IP
```

---

### Phase 3 — Cross-Cutting Utility Endpoint

```
feat(users): GET /api/users/me (API-N-26) – full profile read (used by P4, P5, P7, P9)
```

---

### Phase 4 — User Profile Routes (P3, P4, P9)

```
feat(users): POST /api/users/me/skills (API-N-5) – write currentSkills; mark path stale
feat(users): POST /api/users/me/target-role (API-N-8) – write targetRoleId; mark path stale
feat(users): PATCH /api/users/me/skills/:id (API-N-15) – update proficiency; mark path stale
feat(users): DELETE /api/users/me/skills/:id (API-N-16) – remove from currentSkills; mark path stale
feat(users): DELETE /api/users/me (API-N-17) – delete user + cascade sessions + computed_paths
```

**Staleness rule** (implement as a shared helper called by each of these):
> Find the user's `computed_paths` doc where `status ∈ {active}` and set `status = "stale"`.

---

### Phase 5 — Skills & Roles Catalog Routes (P3, P4, P6)

```
feat(catalog): GET /api/stats/public (API-N-1) – aggregate counts from skills + roles
feat(catalog): GET /api/skills (API-N-4) – text search on name + aliases with ?search= param
feat(catalog): GET /api/skills/:id (API-N-4b) – skill detail + connected edges
feat(catalog): GET /api/roles (API-N-6) – all roles (sortable by demandScore)
feat(catalog): GET /api/roles/:id (API-N-7) – role detail + join skill names for requiredSkills
feat(catalog): GET /api/graph (API-N-11) – skills + edges as JSON graph; scope=path|full
```

For `API-N-11` with `scope=path`, filter to nodes in `users.activePathId`'s selected path steps + their direct prerequisites. Map `sourceSkillId`/`targetSkillId` → `source`/`target` in the response (required by react-force-graph).

---

### Phase 6 — Path Computation Routes (P5, P7) — Core Feature

This is the most complex backend work.

```
feat(paths): GET /api/paths/active (API-N-10) – latest non-archived computed_paths doc
feat(paths): POST /api/paths/compute (API-N-9) – full compute chain (see below)
feat(paths): GET /api/paths/:pathDocId/alternatives (API-N-12) – reads from computed_paths
feat(paths): POST /api/paths/select (API-N-13) – write users.selectedPathRank (validate rank exists)
```

**API-N-9 full chain:**
1. Read user's held skills = `currentSkills ∪ completedSkills` (take max rank per skill)
2. Read `roles.requiredSkills` for `users.targetRoleId`, convert `minProficiency` strings to ranks
3. Build API-P-1 request body: `{ heldSkills, requirements, k:3, alpha:0.7, beta:0.3, useHeuristic:true }`
4. POST to `<PYTHON_URL>/compute/paths` with `X-Internal-Key` header
5. On success: archive previous non-archived doc (`status → "archived"`), insert new doc (`status: "active"`), update `users.activePathId` + `selectedPathRank = 1`
6. On Python failure (`503`): keep old doc as `stale`, return `503` to client

---

### Phase 7 — Progress Tracking (P8)

```
feat(progress): POST /api/users/me/skills/complete (API-N-14) – full recompute chain
feat(progress): GET /api/paths/history (API-N-27) – archived computed_paths ordered by generatedAt desc
```

**API-N-14 chain:**
1. Append to `users.completedSkills` with `proficiency = step.toRank`, `targetRoleId`, `fromPathId`
2. Trigger same recompute chain as API-N-9
3. If Python fails: mark old doc `stale`, return `202 { recomputePending: true }` (completion still saved)

---

### Phase 8 — Admin CRUD (P10)

```
feat(admin): POST/PATCH/DELETE /api/admin/skills (API-N-18, N-19, N-20)
feat(admin): estHours fallback: baseDifficulty × 8 when estHours omitted on create
feat(admin): skill delete cascade: block (409) if skill in any role's requiredSkills; else delete edges + pull from user arrays
feat(admin): GET /api/admin/edges (API-N-30) – list edges, optional ?skillId= filter
feat(admin): POST/PATCH/DELETE /api/admin/edges (API-N-21, N-22, N-23) – with validation:
  - both skills exist, no self-loop, no duplicate
  - group only on prerequisite_of
  - cycle check on prerequisite_of subgraph (FR-14)
feat(admin): POST/PATCH/DELETE /api/admin/roles (API-N-24, N-25, N-29)
feat(admin): role delete cascade: affected users get targetRoleId=null; their active paths archived
feat(admin): GET /api/admin/graph/metrics (API-N-31) – proxy to API-P-3
feat(admin): after every admin write → call POST /graph/reload (API-P-5) + mark all active paths stale
```

**Cycle check for edge creation/update (FR-14):**
After tentatively adding the new edge, run a topological sort (Kahn's algorithm or DFS) over the `prerequisite_of` subgraph. If a cycle is detected, reject with `409 { error: "This edge would create a cycle." }`.

---

### Phase 9 — Documentation (D7)

```
docs(d7): OpenAPI/Swagger spec for all API-N-* endpoints (use swagger-jsdoc or hand-write)
docs(d7): architecture diagram (MERN + Python sidecar + MongoDB)
```

---

### Interfaces Member B Must Provide

| Gives to | What |
|---|---|
| **Member A** | Confirms Python service's internal URL format + `INTERNAL_API_KEY` env var name |
| **Member C** | Base API URL, all endpoint paths, JWT header format (`Authorization: Bearer <token>`), exact request/response shapes for every endpoint |
| **Member C** | Confirms seed data is loaded so typeahead returns real results |

---

---

## 👤 Member C — React Frontend Integrator

> **Owns:** D2 (frontend), D4 (roadmap + graph explorer), D5 (progress tracker), D7 (user guide + screenshots)

> **Starting point:** Figma design downloaded + UI codebase already running.
> Work = replace mock data / hardcoded values with **real API calls**, implement the two complex interactive features (graph explorer, progress tracker recompute), and make targeted UI adjustments per spec.

---

### Phase 1 — API Layer Setup

Before touching individual pages, create a clean API layer so every page uses the same auth headers.

```
feat(api): create src/api/client.js – axios instance with base URL + JWT header injection
feat(api): create src/api/auth.js – register, login, logout wrappers
feat(api): create src/api/users.js – getMe, postSkills, patchSkill, deleteSkill, setTargetRole, deleteAccount
feat(api): create src/api/skills.js – searchSkills, getSkill, getGraph, getPublicStats
feat(api): create src/api/roles.js – getRoles, getRole
feat(api): create src/api/paths.js – computePath, getActivePath, getAlternatives, selectPath, completeSkill, getHistory
feat(api): auth context / hook (useAuth) – JWT storage, login/logout state, protected route wrapper
```

---

### Phase 2 — Wire Up Existing Pages

For each page: remove any hardcoded/mock data and connect to the real API endpoint.

```
feat(p1): P1 Landing – call GET /api/stats/public (API-N-1) for live skills/roles count banner
feat(p2): P2 Auth – connect register form to POST /api/auth/register
feat(p2): P2 Auth – connect login form to POST /api/auth/login; store JWT; redirect logic
feat(p3): P3 Onboarding Skills – connect typeahead to GET /api/skills?search= with debounce
feat(p3): P3 Onboarding Skills – connect submit to POST /api/users/me/skills
feat(p4): P4 Role Selection – load roles from GET /api/roles; load user from GET /api/users/me
feat(p4): P4 Role Selection – compute has/needs badge client-side (compare held skills vs requiredSkills)
feat(p4): P4 Role Selection – connect role detail drawer to GET /api/roles/:id
feat(p4): P4 Role Selection – connect select button to POST /api/users/me/target-role
feat(p5): P5 Dashboard – load from GET /api/paths/active; trigger POST /api/paths/compute if 404 or stale
feat(p5): P5 Dashboard – render primary path roadmap from paths[rank=1].steps
feat(p5): P5 Dashboard – render alternative path cards from paths[rank>1]
feat(p5): P5 Dashboard – progress ring = completedForRole / (completedForRole + remainingSteps)
feat(p5): P5 Dashboard – estimated time = sum of selected path's steps[].estCost
feat(p7): P7 Alternatives – load from GET /api/paths/:pathDocId/alternatives
feat(p7): P7 Alternatives – connect "Select this path" to POST /api/paths/select; update UI
feat(p7): P7 Alternatives – handle "Only one route exists" message when paths.length === 1
feat(p9): P9 Settings – populate forms from GET /api/users/me
feat(p9): P9 Settings – connect proficiency edit to PATCH /api/users/me/skills/:id
feat(p9): P9 Settings – connect remove skill to DELETE /api/users/me/skills/:id
feat(p9): P9 Settings – connect sign out to POST /api/auth/logout; clear JWT; redirect
feat(p9): P9 Settings – connect delete account to DELETE /api/users/me
feat(p10): P10 Admin – load skills/roles using existing catalog APIs; connect skill/role CRUD forms
```

---

### Phase 3 — Force-Directed Graph Explorer (D4 — P6)

This is one of the two features that needs **new** UI implementation.

```
feat(p6): install and configure react-force-graph (or d3-force)
feat(p6): P6 Graph – call GET /api/graph?scope=full to get { nodes, edges }
feat(p6): P6 Graph – render force-directed graph with node labels
feat(p6): P6 Graph – hover edge → show tooltip with type + group (if any)
feat(p6): P6 Graph – click node → call GET /api/skills/:id → show detail panel (name, description, estHours, marketDemand, aliases, edges)
feat(p6): P6 Graph – add scope toggle button: "Show full graph" / "Show my path"
feat(p6): P6 Graph – scope=path call → filter graph to active path nodes + direct prerequisites
```

---

### Phase 4 — Progress Tracker + Recompute (D5 — P8)

The other feature needing careful implementation (the recompute loop is the trickiest part).

```
feat(p8): P8 Progress – load active path from GET /api/paths/active as checklist
feat(p8): P8 Progress – connect checkbox → POST /api/users/me/skills/complete
feat(p8): P8 Progress – on 200 response: refresh active path → re-render updated roadmap
feat(p8): P8 Progress – on 202 {recomputePending: true}: show "Updating your path..." banner; poll GET /api/paths/active until status !== "stale"
feat(p8): P8 Progress – path history panel: load from GET /api/paths/history; show archived snapshots with timestamps
feat(p8): P8 Progress – update progress ring live after each completion
```

---

### Phase 5 — UI Adjustments & Polish

```
fix(ui): P5 – display rationale string per step ("why this skill is here") from steps[].rationale
fix(ui): P4 – show OR-group label in role detail (e.g., "BI tool: Tableau or Power BI")
fix(ui): P7 – show which OR-choice each alternative makes (visible difference between Alt 1 and Alt 2)
fix(ui): responsive – verify roadmap and graph views are legible at 768px+ (spec 5.5)
fix(ui): P5 – handle stale path: show cached roadmap + "Recalculating..." overlay
fix(ui): P10 – admin-only: hide admin nav link for role=learner users
```

---

### Phase 6 — User Guide (D7)

```
docs(d7): user guide – screenshots of P2→P3→P4→P5→P8 flow
docs(d7): user guide – annotated screenshot of graph explorer with hover/click explained
```

---

### Interfaces Member C Depends On

| Needs from | What |
|---|---|
| **Member B** | All `/api/*` endpoint URLs, JWT header format, exact response schemas |
| **Member A** | Seed data loaded in DB so typeahead returns real skill names, not empty |

---

---

## 🔗 Shared Agreements (Must Decide Together Before Coding)

| Topic | Decision |
|---|---|
| **Proficiency ranks** | `beginner=1, intermediate=2, advanced=3`, `0 = not known`. Applied by Python (not Node). |
| **Step cost formula** | `estHours × (toRank − fromRank) / 2` (lives on the node, not the edge) |
| **Auth header** | `Authorization: Bearer <JWT>` on every protected route |
| **Internal key** | `X-Internal-Key: <INTERNAL_API_KEY>` on every Python endpoint except `/health` |
| **CORS** | Member B enables CORS for Member C's dev origin |
| **`.env.example`** | Member A + B write it together with `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `INTERNAL_API_KEY`, `PYTHON_SERVICE_URL` |
| **Slug vs ObjectId** | All `*Id` fields and `:id` route params are ObjectIds. Human-readable keys are `slug`. |
| **Stale path display** | Frontend shows last known roadmap with a "Recalculating..." indicator while stale |

---

## 🔀 Integration Checklist (Run Together)

| Step | Who runs it |
|---|---|
| `node scripts/seed.js` — populate MongoDB with real data | Member A |
| `uvicorn main:app --port 5001` — start Python service; `curl /health` | Member A |
| `node index.js` — start Node API; test `GET /api/stats/public` | Member B |
| `npm run dev` — start React app; confirm Landing page loads | Member C |
| Full flow: Register → Onboard → Select role → Dashboard → path renders | All 3 |
| Mark skill complete → path shortens; progress ring updates | Member B + C |
| Toggle graph scope path/full; click a node → detail panel | Member C |
| `node scripts/seed-eval.js` — populate evaluation_scenarios | Member A |
| Review all metrics in DB-6 with Member A | All 3 |

---

## 📦 Repo Structure

```
skillora/
├── data/
│   └── v1/
│       ├── skills.json          ← Member A
│       ├── edges.json           ← Member A
│       └── roles.json           ← Member A
│
├── scripts/
│   ├── seed.js                  ← Member A  (run once to populate DB)
│   └── seed-eval.js             ← Member A  (run once for D6 report)
│
├── skillora-path-service/       ← Member A  (Python/FastAPI)
│   ├── main.py
│   ├── graph_loader.py
│   ├── search.py
│   ├── validate.py
│   ├── models.py
│   ├── tests/
│   └── requirements.txt
│
├── skillora-api/                ← Member B  (Node.js/Express)
│   ├── models/                  (Mongoose schemas)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── skills.js
│   │   ├── roles.js
│   │   ├── paths.js
│   │   └── admin.js
│   ├── middleware/
│   │   ├── auth.js              (JWT + session check)
│   │   └── adminOnly.js
│   ├── services/
│   │   └── pythonProxy.js       (calls Python service with X-Internal-Key)
│   └── index.js
│
├── skillora-client/             ← Member C  (React SPA)
│   └── src/
│       ├── api/                 (client.js, auth.js, users.js, ...)
│       ├── components/
│       ├── pages/
│       │   ├── Landing.jsx
│       │   ├── Auth.jsx
│       │   ├── OnboardingSkills.jsx
│       │   ├── OnboardingRole.jsx
│       │   ├── Dashboard.jsx
│       │   ├── GraphExplorer.jsx
│       │   ├── Alternatives.jsx
│       │   ├── Progress.jsx
│       │   ├── Settings.jsx
│       │   └── Admin.jsx
│       └── hooks/
│           └── useAuth.js
│
└── .env.example                 ← Member A + B  (all env vars listed)
```

---

> [!IMPORTANT]
> **Start here in this order:**
> 1. Member A finishes `seed.js` + uploads data → Member B can start testing routes with real data
> 2. Member B completes auth + `/api/users/me` → Member C can begin integration
> 3. Member A's Python service must be running before Member B can test `POST /api/paths/compute`

> [!TIP]
> For the commit evaluation: aim for **small, focused commits per endpoint or feature** rather than large batch commits. Each commit message should make it clear which API or UI feature it implements (use `feat(scope): description` format as shown above).
