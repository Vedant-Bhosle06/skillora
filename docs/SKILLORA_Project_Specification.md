# SKILLORA — Project Specification
### Skill-Gap Navigator: Objectives, Deliverables, Database Schema, Page/API Mapping & SRS

**Version:** 4.0 (Finalized — MERN + Python Microservice)
**Stack:** MongoDB, Express, React, Node.js for the web application — **plus a dedicated Python/FastAPI/NetworkX microservice** for path computation. The MERN stack covers all user-facing functionality; the Python service is an internal computation-only sidecar.

---

## Changelog

### v1.0 → v2.0

| # | Issue Found | Fix Applied |
|---|---|---|
| 1 | API endpoints were inconsistently labeled — Python endpoints had formal IDs (`API-P-1`...), several Node endpoints didn't, and the traceability table cited IDs that were never defined anywhere else. | Every endpoint across both services now has a formal ID (`API-N-#`, `API-P-#`); traceability table updated to cite only IDs actually defined in Part 4. |
| 2 | `users.activePathId` pointed to a `computed_paths` document, but that document holds a *primary* path **plus** ranked alternatives — there was no field to record which specific ranked path the user picked. | Added `users.selectedPathRank` (defaults to `1`, the primary path). P7's "select alternative" API now correctly writes to this field. |
| 3 | No endpoint existed to read a user's own profile (`GET /api/users/me`) — needed by Role Selection's has/needs comparison, the Dashboard header, and Settings' edit forms. | Added **API-N-26**, referenced from P4, P5, P9; new **FR-18**. |
| 4 | No endpoint existed to fetch archived (past) `computed_paths` docs — API-N-10 only reads `status: active`, but the Progress page requires a path-history view. | Added **API-N-27** (`GET /api/paths/history`), referenced from P8; new **FR-19**. |

### v2.0 → v3.0

| # | Issue Found | Fix Applied |
|---|---|---|
| 1 | No logout endpoint existed — DB-7 (`sessions`) was a dead collection without it. | Added **API-N-28** `POST /api/auth/logout` → invalidates session in DB-7. Referenced from P9 (Settings). Added **FR-20**. |
| 2 | FR-5 referenced "sufficient proficiency" with no defined comparison rule. | Defined proficiency rank: `beginner=1, intermediate=2, advanced=3`. A skill is **held** if `user proficiency rank ≥ role minProficiency rank`. Documented in 5.2.5 and DB-5 schema note. |
| 3 | α and β in the composite scoring formula (O4) were never given default values; API-P-2 request body did not include them. | Defaults defined: `α=0.7, β=0.3`. API-P-2 request body now accepts optional `alpha` and `beta` overrides. Documented in DB-5 schema and O4. |
| 4 | API-N-26 (`GET /api/users/me`) was placed as a floating section between P3 and P4, breaking Part 4's reading flow. | Moved to a dedicated **"Cross-Cutting Utility Endpoints"** subsection at the top of Part 4. |
| 5 | DB-6 (`evaluation_scenarios`) had no associated API or UI — it was dead schema with no documented population strategy. | Explicitly documented as **seed-script-populated**: `scripts/seed-eval.js` populates DB-6 by calling API-P-1/P-2 and recording results. Referenced from D6 acceptance criteria. |
| 6 | Password reset / forgot-password flow was silently absent from the spec. | Explicitly called out as **out of scope for v1** in section 5.1.2 (Scope). |
| 7 | `skills.baseDifficulty` fallback behavior was undefined. | Documented: `weight = targetSkill.baseDifficulty × 8` when an admin creates an edge without explicit weight. |
| 8 | `roles.category` had no enum values defined, unlike `skills.category`. | Added sample enum: `"data" \| "engineering" \| "design" \| "product" \| "management"`. |
| 9 | P6 (Graph Explorer) did not specify what happens on node-click. | Added: clicking a node calls `GET /api/skills/:skillId` (API-N-4b) to show a detail panel. |
| 10 | NFRs did not mention rate limiting on auth endpoints. | Added rate-limiting requirement (≤10 req/min per IP) to 5.4 Security NFR. |
| 11 | FR-2 mentioned "configurable expiry" without defining what that means or whether refresh tokens exist. | Clarified: expiry via `JWT_EXPIRES_IN` env var (default `7d`); no refresh-token flow in v1. |
| 12 | `users` collection had no `role` field — admin route gating (`users.role === "admin"`) was mentioned in P10 but the field was absent from the schema. | Added `role: "learner" \| "admin"` field to DB-1. |

### v3.0 → v4.0

| # | Issue Found | Fix Applied |
|---|---|---|
| 1 | **Algorithm did not solve the problem.** Dijkstra from a virtual start to a virtual goal returns *one chain* reaching *one* missing skill; the real goal is to cover *all* missing requirements and *all* their prerequisites (prerequisites are AND). | Path computation redefined as **A\* over a state space** (state = set of skills held; move = learn one unlocked skill; goal = all role requirements met). Dijkstra = same search with `h = 0`. See 4.3. |
| 2 | With AND-only prerequisites the set of skills to learn is fixed, so `shortest_simple_paths` (Yen's) could not produce meaningful alternatives (O4/FR-7). | Added **OR-groups**: role requirements use `anyOf: [...]` (e.g., Tableau *or* Power BI), and prerequisite edges carry an optional `group` (one-of-several). Alternatives = next-best non-dominated goal states from the same A* search. Yen's removed. |
| 3 | "Topological consistency check via `is_directed_acyclic_graph`" tested the *graph* for cycles, not the *path order*. FR-6 was never actually verified. | Ordering is correct by construction (a skill can only be learned once its prerequisites are met) and is verified by a dedicated `validate_order()` function. `is_directed_acyclic_graph` is kept only for admin cycle checks / API-P-3. |
| 4 | Learning hours lived on edges (`weight` = hours to learn the target), so a skill with 3 prerequisites had 3 different costs and summing edges double-counted. | Cost moved to the node: `skills.estHours` (default `baseDifficulty × 8`). Edge `weight` removed. |
| 5 | Symmetric `corequisite_with` edges were mixed into the directed search graph, creating A↔B cycles. | `corequisite_with` is display/rationale-only; excluded from the search graph and from cycle checks. |
| 6 | Composite score `α·hours + β·(1−demand)` mixed units (~100 vs. 0–1), so β had no effect; "demand" was taken from edge co-occurrence, which is not skill demand. | Score normalized: `α·(cost / maxCost) + β·(1 − marketDemandAvg)`; demand comes from new node field `skills.marketDemand`. Edge `marketCoOccurrence` removed. |
| 7 | Contradiction about who applies the held-skill filter (spec said Python, but the request body had no `minProficiency`; Working Guide said Node). | Node sends raw data (`heldSkills` with ranks, `requirements` with `minRank`); **Python applies the rule.** |
| 8 | No "held" rule for non-required prerequisite skills. | A prerequisite is satisfied by *any* proficiency (rank ≥ 1). Documented in 5.2.5. |
| 9 | `completedSkills` were never treated as held; their proficiency was undefined. | `completedSkills` entries store the `proficiency` reached. Held proficiency = max over `currentSkills` ∪ `completedSkills`. |
| 10 | `status: "stale"` was never set; profile edits, role change and admin edits left paths out of date; only API-N-14 archived old docs. | Staleness rules added (DB-5 note): API-N-5/8/15/16 and admin graph writes mark active paths `stale`; API-N-9 archives the previous doc; dashboard recomputes when stale. |
| 11 | Progress ring `completedSkills.length / path.steps.length` broke because the path shrinks after each recompute. | Ring = `completedForRole / (completedForRole + remainingSteps)`; `completedSkills` entries record `targetRoleId`. |
| 12 | Evaluation baseline ("missing required skills, unordered") omitted prerequisites, so it was *cheaper* than the system's path — "time saved" would be negative. `humanExpertPath` was stored but unused. | Baseline redefined as the **generic roadmap** (all required skills + all prerequisites, from zero, ignoring held skills). New metrics: expert overlap (Jaccard, Kendall τ) and A* vs. Dijkstra states expanded. |
| 13 | `selectedPathRank` "preserved if the rank still exists" was misleading — rank 2 after recompute may be a different path. | `selectedPathRank` resets to `1` on every new `computed_paths` doc. |
| 14 | `skillId` meant both a string slug and an ObjectId. | Slugs renamed to `slug` (`skills.slug`, `roles.slug`); every `skillId`/`roleId` and every `:id` route param is an ObjectId. |
| 15 | `API-C-3` (5.2.3) was undefined; API-P-3 had no Node proxy for the admin UI. | Corrected to API-P-3; added **API-N-31** `GET /api/admin/graph/metrics`. |
| 16 | Admin deletes had no cascade rules; no DELETE for roles; no admin edge listing. | Cascade/block rules documented in P10; added **API-N-29** (delete role) and **API-N-30** (list edges). |
| 17 | Python graph cache behaviour undefined; admin edits would not be seen. | Graph loaded into memory at startup; **API-P-5** `POST /graph/reload` called by Node after every admin write. |
| 18 | "Never publicly accessible" is not achievable on free hosting tiers (each service gets a public URL). | All Python endpoints except `/health` require an `X-Internal-Key` shared-secret header. Unit tests use in-memory fixture graphs (no MongoDB). |
| 19 | Reliability NFR did not cover a failed recompute after marking a skill complete. | Completion is always persisted; path marked `stale`; API returns `recomputePending: true`; dashboard retries. |
| 20 | Missing indexes; account deletion left orphan data. | Added TTL index on `sessions.expiresAt`, `{userId, status}` on `computed_paths`; API-N-17 cascades to sessions and paths. |
| 21 | `roles.requiredSkills.weight` and `roles.demandScore` were undefined/unused. | `weight` removed; `demandScore` used for sorting/badges on P4. |
| 22 | API-P-1 and API-P-2 overlapped (P-2's rank 1 *is* the primary path), running the search twice; `computed_paths.algorithm` was a single value for mixed algorithms. | Merged into one endpoint **API-P-1** `POST /compute/paths` returning k ranked paths. **API-P-2 retired.** `algorithm` ∈ `a_star \| dijkstra \| greedy_fallback`. |
| 23 | P1 banner said "20+ roles" while the dataset plan targets 15–20. | Banner changed to "80+ skills, 15+ roles". |
| 24 | No size guard: A\* over sets of skills is exponential in the worst case. | Search capped at 200,000 expanded states → falls back to cost-aware topological sort (`algorithm: "greedy_fallback"`). |

---

## How This Document Is Structured

- Objectives: **O1–O6**
- Deliverables: **D1–D7**, each names which Objective(s) it fulfills
- DB Collections: **DB-1...**, each is used by specific pages/APIs
- Pages: **P1...**, each lists its exact API calls
- APIs: **API-N-#** (Node.js Web/API service) and **API-P-#** (Python Path-Computation service)
- SRS functional requirements: **FR-#**, each maps back to a Page/API/Objective

---

## PART 1 — FINALIZED OBJECTIVES

**O1 — Model skills as a knowledge graph.**
Build a graph of 80–120 curated skill nodes, each carrying an estimated learning effort (`estHours`) and a market-demand score (`marketDemand`, 0–1), connected by typed edges: `prerequisite_of` (mandatory, or one-of-several via a `group`) and `corequisite_with` (informational).

**O2 — Capture user skill profile and target role with low friction.**
Let a user self-report current skills + proficiency (Beginner/Intermediate/Advanced) and pick a target role from a curated role catalog, in under ~2 minutes of interaction.

**O3 — Compute a minimum-effort learning path via weighted shortest-path search.**
Given the user's current skills and a target role's requirements, run **A\*** (Dijkstra as the `h = 0` baseline) over the state space of "skills held so far" to output a prerequisite-respecting, minimum-cost ordered sequence of *only the skills the user doesn't already hold*, choosing the cheapest option wherever OR-alternatives exist.

**O4 — Generate and rank multiple alternative paths.**
Surface 2–3 near-optimal, genuinely different routes to the same role (different OR-choices) and rank them with a composite cost: `α·(cost / maxCost) + β·(1 − marketDemandAvg)`, default **`α=0.7, β=0.3`** (speed-biased), so users can trade off speed vs. market relevance.

**O5 — Present the path visually, with progress tracking that triggers recomputation.**
Render the path as an ordered visual roadmap and the graph as an explorable force-directed diagram; let users mark skills complete, which triggers recomputation and re-ranking of the remaining path.

**O6 — Validate recommendations against a naive baseline and human judgment.**
Define ≥5 test scenarios, compare system output to (a) a naive **generic-roadmap** baseline (all required skills + all prerequisites, learned from zero, unordered, ignoring held skills) and (b) a manually reasoned "what a human advisor would say" benchmark, and report quantified deltas.

---

## PART 2 — FINALIZED DELIVERABLES

| ID | Deliverable | Fulfills | Key Acceptance Criteria |
|---|---|---|---|
| **D1** | Curated skills knowledge graph dataset | O1 | 80–120 nodes, ≥150 `prerequisite_of` edges, every skill has `estHours` + `marketDemand`; prerequisite subgraph verified acyclic; every role has ≥1 OR-choice (an `anyOf` requirement or a grouped prerequisite) so alternatives exist; documented curation sourcing (job postings, syllabi, roadmap.sh, expert review); stored as versioned JSON (`data/v1/*.json`) + `scripts/seed.js` |
| **D2** | Working full-stack MERN web app | O2, O5 | Auth, profile builder, role browser, dashboard — deployed and reachable via URL |
| **D3** | Python/FastAPI/NetworkX Path-Computation microservice | O3, O4 | Separate FastAPI app; A\* state-space search (custom `heapq` implementation, since `networkx.astar_path` needs an explicit graph) with an admissible, consistent heuristic and a Dijkstra mode (`useHeuristic: false`); NetworkX used for graph storage, `ancestors`, topological sort and cycle detection; `validate_order()` for prerequisite ordering; unit-tested (≥80% coverage, pytest) on in-memory fixture graphs with no MongoDB dependency; independently runnable/demo-able via `curl`/Postman on its own port (with `X-Internal-Key`), with no dependency on the web app or a logged-in session |
| **D4** | Interactive roadmap + graph explorer UI | O5 | Ordered roadmap component + force-directed graph view (e.g., `react-force-graph` or `d3-force`) with hover explanations ("why this skill is here", taken from each step's `rationale`) and node-click skill detail panel |
| **D5** | Progress tracking & recomputation feature | O5 | Checkbox-driven completion, remaining path recomputed within visible latency budget (<2s for graphs of this size), old path archived not deleted |
| **D6** | Evaluation report with benchmarking | O6 | ≥5 scenarios seeded via `scripts/seed-eval.js`; metrics table (time saved % vs. generic roadmap, redundant skills avoided, prerequisite-order violations system vs. shuffled baseline, Jaccard / Kendall τ vs. expert path, states expanded A\* vs. Dijkstra); limitations & scaling discussion |
| **D7** | Project documentation (architecture, schema, API docs, user guide) | All | Architecture diagram (showing MERN services + Python microservice + shared/separate DB access), this schema doc, OpenAPI/Swagger spec for both services, end-user guide with screenshots |

---

## PART 3 — DATABASE SCHEMA (MongoDB)

Skill **nodes** and **edges** are kept in two separate collections (rather than embedded adjacency lists) because edges need independent querying, indexing, and updates without rewriting node documents. The Node.js Web/API service owns all reads and writes. The Python Path-Computation microservice only ever *reads* `skills`/`skill_edges` (never writes), which keeps it stateless per D3's acceptance criteria.

**ID convention:** every field or route parameter named `...Id` / `:id` is a MongoDB `ObjectId`. Human-readable identifiers are always called `slug`.

**Proficiency ranks:** `beginner=1, intermediate=2, advanced=3` (0 = not known).

### DB-1: `users`
```js
{
  _id: ObjectId,
  name: String,
  email: String,              // unique index
  passwordHash: String,
  role: "learner" | "admin",  // default "learner"; controls admin route access server-side
  createdAt: Date,
  updatedAt: Date,
  currentSkills: [            // self-reported
    { skillId: ObjectId, proficiency: "beginner"|"intermediate"|"advanced", addedAt: Date }
  ],
  completedSkills: [          // learned through SKILLORA paths
    { skillId: ObjectId, proficiency: "beginner"|"intermediate"|"advanced", // level reached (the step's target)
      targetRoleId: ObjectId, completedAt: Date, fromPathId: ObjectId }
  ],
  targetRoleId: ObjectId,      // nullable, the one active role selection
  activePathId: ObjectId,      // nullable, points into computed_paths (the doc bundles primary + alternatives)
  selectedPathRank: Number     // which ranked path within that doc is active; default 1; reset to 1 on every recompute
}
```
**Held proficiency** of a skill = the highest rank found for it across `currentSkills` ∪ `completedSkills`.

### DB-2: `skills`  (graph nodes)
```js
{
  _id: ObjectId,
  slug: String,                // e.g. "python-pandas"
  name: String,
  category: String,            // "programming" | "math" | "tool" | "domain" | "soft-skill" | ...
  description: String,
  aliases: [String],           // for search / dedup; also used by typeahead autocomplete on P3
  baseDifficulty: Number,      // 1-5 scale
  estHours: Number,            // estimated hours from zero to intermediate (working) level;
                               //   defaults to baseDifficulty × 8 when an admin omits it
  marketDemand: Number,        // 0.0-1.0, share of sampled job postings mentioning this skill (curated)
  createdAt: Date,
  updatedAt: Date
}
```
Indexes: `slug` (unique), text index on `name` + `aliases` (for search UI and typeahead autocomplete).

**Cost of a learning step:** learning skill *s* from rank *r* to target rank *t* costs `estHours(s) × (t − r) / 2`. So zero→beginner = 0.5 × estHours, zero→intermediate = 1.0 ×, beginner→intermediate = 0.5 ×, zero→advanced = 1.5 ×.

### DB-3: `skill_edges`
```js
{
  _id: ObjectId,
  sourceSkillId: ObjectId,     // ref skills._id  (the prerequisite)
  targetSkillId: ObjectId,     // ref skills._id  (the skill that needs it)
  type: "prerequisite_of" | "corequisite_with",
  group: String | null,        // prerequisite_of only. null = mandatory.
                               //   Edges into the same target sharing a group value = "needs ANY ONE of these"
  source: String,              // curation source note
  createdAt: Date
}
```
Indexes: compound `{sourceSkillId, targetSkillId, type}` unique; separate indexes on `sourceSkillId` and `targetSkillId` for adjacency lookups in both directions.

Semantics: a skill can be learned once **all** of its mandatory prerequisites are known **and** at least one prerequisite from each of its groups is known. `corequisite_with` edges are informational only (shown in the graph explorer and used in rationales); they are never used in the search or in cycle checks.

### DB-4: `roles`
```js
{
  _id: ObjectId,
  slug: String,                 // e.g. "data-analyst"
  title: String,
  description: String,
  category: String,             // "data" | "engineering" | "design" | "product" | "management"
  demandScore: Number,          // 0-1, overall market demand for the role; used to sort/badge roles on P4
  requiredSkills: [
    { anyOf: [ObjectId],        // one element = mandatory skill; several = any one of them satisfies it
      label: String,            // optional, e.g. "BI tool" (shown in UI/rationale for OR-groups)
      minProficiency: "beginner"|"intermediate"|"advanced" }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### DB-5: `computed_paths`
```js
{
  _id: ObjectId,
  userId: ObjectId,
  targetRoleId: ObjectId,
  generatedAt: Date,
  algorithm: "a_star" | "dijkstra" | "greedy_fallback",
  alpha: Number,                // composite score weight for normalized learning cost (default 0.7)
  beta: Number,                 // composite score weight for (1 - market demand) (default 0.3)
  stats: { statesExpanded: Number, elapsedMs: Number },
  status: "active" | "stale" | "archived",
  paths: [
    {
      rank: Number,             // 1 = primary recommendation (lowest compositeScore)
      type: "primary" | "alternative",
      totalLearningCost: Number,  // hours
      marketDemandAvg: Number,    // mean skills.marketDemand over the steps
      compositeScore: Number,     // α·(totalLearningCost / maxCost) + β·(1 − marketDemandAvg); lower is better.
                                  //   maxCost = highest totalLearningCost among the candidates returned
      steps: [
        { skillId: ObjectId, order: Number, fromRank: Number, toRank: Number, estCost: Number, rationale: String }
      ]
    }
  ]
}
```
Indexes: `{userId, status}`, `{userId, generatedAt: -1}`.

This collection is **append/version-based**. Lifecycle rules:
- **At most one non-archived doc per user.**
- **Becomes `stale`** when its inputs change: API-N-5, API-N-8, API-N-15, API-N-16 (the user's own doc), and any admin write to skills/edges/roles (API-N-18–25, API-N-29 — all users' active docs).
- **On recomputation** (API-N-9, or the recompute inside API-N-14): the Python call is made *first*; only on success is the old doc set to `archived` and a new `active` doc inserted. `users.activePathId` then points to it and `users.selectedPathRank` resets to `1`.
- If the Python call fails, the old doc is kept (marked `stale`) so the dashboard can still show it.

### DB-6: `evaluation_scenarios`  (supports D6)
```js
{
  _id: ObjectId,
  scenarioName: String,
  currentSkills: [{ skillId: ObjectId, proficiency: String }],
  targetRoleId: ObjectId,
  humanExpertPath: [ObjectId],   // manually reasoned benchmark (hand-authored in seed script)
  systemPath: [ObjectId],        // rank-1 path from API-P-1 (A* mode)
  baselinePath: [ObjectId],      // generic roadmap: all required skills (first anyOf option) + all prerequisites, from zero
  metrics: {
    systemHours: Number,
    baselineHours: Number,
    timeSavedPct: Number,             // (baselineHours − systemHours) / baselineHours × 100
    redundantSkillsAvoided: Number,   // baseline skills the user already holds at sufficient proficiency
    systemOrderViolations: Number,    // must be 0 (prerequisite pairs out of order)
    baselineOrderViolations: Number,  // mean over 20 random shuffles of the baseline
    expertJaccard: Number,            // |system ∩ expert| / |system ∪ expert|
    expertKendallTau: Number,         // order agreement on skills common to both
    statesExpandedAStar: Number,
    statesExpandedDijkstra: Number    // same scenario with useHeuristic: false
  },
  createdAt: Date
}
```
**Population strategy:** DB-6 is **not** populated through the UI. A Node.js script `scripts/seed-eval.js` calls API-P-1 directly (twice per scenario: A\* mode and Dijkstra mode) with the ≥5 predefined scenarios from D6, computes the metrics, and upserts into `evaluation_scenarios`. Human expert paths are hand-authored by the developer and hard-coded in the seed script; baseline paths are generated by the script from the role definition. Run once before generating the D6 report — not part of the live application flow.

### DB-7: `sessions`
```js
{ _id: ObjectId, userId: ObjectId, tokenHash: String, expiresAt: Date }
```
Indexes: `tokenHash` (unique); **TTL index** on `expiresAt` (`expireAfterSeconds: 0`) so expired sessions are removed automatically.
Used for server-side session invalidation. On login (API-N-3), a JWT is issued *and* a session record is written. On logout (API-N-28), the session record is deleted, making the token invalid even before its natural expiry. Protected-route middleware verifies the token hash exists in DB-7.

---

## PART 4 — WEBSITE PAGES & API MAPPING

**Architecture: MERN web application + Python computation sidecar**
- **Web/API service** (`skillora-api`, Node.js/Express, `/api/...`) — owns auth, users, skills/roles catalog, and progress; the only service the React frontend ever talks to.
- **Path-Computation service** (`skillora-path-service`, Python/FastAPI) — internal-only, stateless, loads `skills`/`skill_edges` from MongoDB into memory at startup. The Web/API service proxies to it and enforces user auth before forwarding. Every endpoint except `/health` requires the header `X-Internal-Key: <INTERNAL_API_KEY>`; the browser never receives this key.

### Cross-Cutting Utility Endpoints (used by multiple pages)

**API-N-26** `GET /api/users/me`
Reads the full current-user document (`currentSkills`, `completedSkills`, `targetRoleId`, `activePathId`, `selectedPathRank`) from `users` (DB-1). Used by P4 (has/needs comparison), P5 (dashboard header), P7 (to find `activePathId`), and P9 (edit forms). This is the single shared profile-read endpoint for any page that needs to know "what does this user already have."

**API-N-28** `POST /api/auth/logout`
Deletes the session record from `sessions` (DB-7), invalidating the JWT server-side even before its natural expiry. Used by P9 (Settings "Sign out" button) and any global nav logout control.

---

### P1 — Landing Page (`/`)
Public marketing/explainer page. No auth.
- **API-N-1** `GET /api/stats/public` → reads aggregate counts from `skills` (DB-2), `roles` (DB-4) for a "80+ skills, 15+ roles mapped" banner.

### P2 — Register / Login (`/register`, `/login`)
- **API-N-2** `POST /api/auth/register` → writes `users` (DB-1)
- **API-N-3** `POST /api/auth/login` → reads `users` (DB-1), issues JWT (expiry via `JWT_EXPIRES_IN` env var, default `7d`), writes session record to `sessions` (DB-7). No refresh-token flow in v1.

### P3 — Onboarding: Skill Profile Builder (`/onboarding/skills`)
Searchable multi-select of skills + proficiency picker per skill. Typeahead autocomplete leverages the `skills` text index on `name` + `aliases`.
- **API-N-4** `GET /api/skills?search=` → reads `skills` (DB-2), text index search on `name` + `aliases`
- **API-N-5** `POST /api/users/me/skills` → writes `currentSkills` array in `users` (DB-1); marks the user's active path `stale`

### P4 — Target Role Selection (`/onboarding/role`)
Browse/search role catalog (sortable by `demandScore`), view the requirement breakdown per role (OR-groups shown as "any one of"). The "has/needs" badge on each role card is computed client-side from the user profile (fetched via API-N-26) against the role's `requiredSkills`, using the held-skill rule in 5.2.5.
- **API-N-6** `GET /api/roles` → reads `roles` (DB-4)
- **API-N-7** `GET /api/roles/:id` → reads `roles` + joins `skills` for display names
- **API-N-8** `POST /api/users/me/target-role` → writes `targetRoleId` in `users` (DB-1); marks the user's active path `stale`
- **API-N-26** `GET /api/users/me` → reads held skills (DB-1) for the has/needs comparison

### P5 — Dashboard / Roadmap View (`/dashboard`)
The core screen — shows the selected computed path as an ordered visual roadmap, a summary card per alternative path, estimated total time-to-complete, and a skill-gap progress ring.

**Load flow:** call API-N-10. If it returns 404 (no path yet) or a doc with `status: "stale"`, show the cached doc (if any) and call API-N-9.

- **API-N-9** `POST /api/paths/compute` → validates auth, reads the user's held skills (`currentSkills` ∪ `completedSkills`) and the target role's `requiredSkills`, then internally calls:
  - **API-P-1** `POST /compute/paths` (Python service) → returns up to *k* ranked paths (rank 1 = primary) with a `rationale` per step
  - then archives any previous non-archived doc, writes the result to `computed_paths` (DB-5) as `active`, sets `users.activePathId` and `selectedPathRank = 1` (DB-1), and returns it to the client. On Python failure → `503`; the previous doc stays (as `stale`).
- **API-N-10** `GET /api/paths/active` → reads the user's latest non-archived `computed_paths` doc (`active` or `stale`)
- **API-N-26** `GET /api/users/me` → reads `users` (DB-1) for the header summary (target role, skills remaining count)

**Progress ring** = `completedForRole / (completedForRole + remainingSteps)`, where `completedForRole` = `completedSkills` entries whose `targetRoleId` equals the current target role, and `remainingSteps` = number of steps in the selected path. **Estimated time** = sum of `steps[].estCost` of the selected path.

### P6 — Skill Graph Explorer (`/graph`)
Force-directed visualization of the full graph or the subgraph relevant to the user's path. Hovering an edge shows the relationship type (and OR-group, if any). Clicking a node fetches and displays a skill detail panel.
- **API-N-11** `GET /api/graph?scope=path|full` → reads `skills` + `skill_edges` (DB-2, DB-3); `scope=path` keeps only nodes in the selected path plus their direct prerequisites
- **API-N-4b** `GET /api/skills/:id` → reads `skills` (DB-2) for the node-click detail panel (name, description, aliases, estHours, marketDemand, connected edges)

### P7 — Path Alternatives Comparison (`/dashboard/alternatives`)
Side-by-side comparison of the ranked paths (hours vs. market-demand tradeoff, and which OR-choices each one makes). If only one non-dominated path exists, the page says "Only one route exists for your profile."
- **API-N-12** `GET /api/paths/:pathDocId/alternatives` → reads `computed_paths` (DB-5); `pathDocId` comes from `users.activePathId` (API-N-26)
- **API-N-13** `POST /api/paths/select` body `{ rank }` → validates the rank exists in the active doc, writes `users.selectedPathRank` (DB-1). Writes the *rank*, not a new `activePathId`, since all ranked options live inside the one active `computed_paths` document.

### P8 — Progress Tracker (`/progress`)
Checklist of the selected path's steps; marking one complete triggers recompute. Also shows a path history panel.
- **API-N-10** `GET /api/paths/active` → the steps to show as a checklist
- **API-N-14** `POST /api/users/me/skills/complete` body `{ skillId }` → appends to `completedSkills` (DB-1) with `proficiency` = the step's `toRank`, `targetRoleId`, `fromPathId`; then runs the same recompute chain as API-N-9 (API-P-1 → archive old doc → insert new → update `activePathId`, reset `selectedPathRank`). This chain is what "recomputation" (O5/D5) means at the API level. If the Python call fails, the completion is still saved, the old doc is marked `stale`, and the response is `202 { recomputePending: true }`.
- **API-N-27** `GET /api/paths/history` → reads `computed_paths` where `status: archived` for this `userId`, ordered by `generatedAt` desc, for the path-history panel.

### P9 — Profile / Settings (`/settings`)
Edit proficiency levels, remove skills, change target role, sign out, delete account.
- **API-N-15** `PATCH /api/users/me/skills/:id` → updates proficiency; marks active path `stale`
- **API-N-16** `DELETE /api/users/me/skills/:id` → removes from `currentSkills`; marks active path `stale`
- **API-N-17** `DELETE /api/users/me` → deletes the user **and** cascades: their `sessions` and `computed_paths`
- **API-N-8** `POST /api/users/me/target-role` → change target role
- **API-N-26** `GET /api/users/me` → populates the edit forms with current profile state
- **API-N-28** `POST /api/auth/logout` → signs the user out (invalidates session in DB-7)

### P10 — Admin: Curate Skills & Roles (`/admin/*`, role-gated)
CRUD for D1's dataset. All admin routes check `users.role === "admin"` server-side. **After every successful admin write, Node calls API-P-5 (graph reload) and marks all `active` paths `stale`.** Lists use the public read endpoints API-N-4 (skills) and API-N-6 (roles).
- **API-N-18** `POST /api/admin/skills` (if `estHours` omitted, server sets `estHours = baseDifficulty × 8`), **API-N-19** `PATCH /api/admin/skills/:id`, **API-N-20** `DELETE /api/admin/skills/:id` → `skills` (DB-2).
  Delete rule: **blocked (409)** if any role lists the skill in `requiredSkills`; otherwise deletes all edges touching the skill and pulls it from every user's `currentSkills`/`completedSkills`.
- **API-N-30** `GET /api/admin/edges?skillId=` → lists `skill_edges` (DB-3), optionally filtered to one skill
- **API-N-21** `POST /api/admin/edges`, **API-N-22** `PATCH /api/admin/edges/:id`, **API-N-23** `DELETE /api/admin/edges/:id` → `skill_edges` (DB-3). Create/update validation: both skills exist, no self-loop, no duplicate, `group` only on `prerequisite_of`, and **no cycle** in the `prerequisite_of` subgraph (see FR-14).
- **API-N-24** `POST /api/admin/roles`, **API-N-25** `PATCH /api/admin/roles/:id`, **API-N-29** `DELETE /api/admin/roles/:id` → `roles` (DB-4). Delete rule: users targeting the role get `targetRoleId = null` and their non-archived paths are archived.
- **API-N-31** `GET /api/admin/graph/metrics` → proxies **API-P-3** for the admin "graph health" panel (orphan nodes, cycle check, average degree)

### Path-Computation Service — Full Internal API Summary (Python/FastAPI)

| ID | Endpoint | Method | Purpose | Implementation | DB Access |
|---|---|---|---|---|---|
| **API-P-1** | `/compute/paths` | POST | Primary path + ranked alternatives, with step rationales | A\* state-space search (4.3); Dijkstra when `useHeuristic: false`; size guard → greedy fallback; composite ranking; `validate_order()` on every returned path | in-memory graph (loaded from `skills`, `skill_edges`) |
| **API-P-3** | `/graph/metrics` | GET | Graph stats for admin/debug (orphan nodes, cycle check, avg degree) | `networkx.is_directed_acyclic_graph`, degree/isolate utilities on the `prerequisite_of` subgraph | in-memory graph |
| **API-P-4** | `/health` | GET | Liveness check (no key required) | — | none |
| **API-P-5** | `/graph/reload` | POST | Reload `skills`/`skill_edges` from MongoDB into memory | called by Node after admin writes | reads `skills`, `skill_edges` |

(API-P-2 was merged into API-P-1 in v4.0.)

**Request body for API-P-1:**
```json
{
  "heldSkills": [ { "skillId": "<ObjectId>", "rank": 1 }, { "skillId": "<ObjectId>", "rank": 2 } ],
  "requirements": [
    { "anyOf": ["<ObjectId>"], "minRank": 2 },
    { "anyOf": ["<ObjectId tableau>", "<ObjectId powerbi>"], "minRank": 1, "label": "BI tool" }
  ],
  "k": 3,
  "alpha": 0.7,
  "beta": 0.3,
  "useHeuristic": true
}
```
`heldSkills` is the merged, max-rank view of `currentSkills` ∪ `completedSkills` built by Node. `requirements` is the role's `requiredSkills` with proficiencies converted to ranks. `k`, `alpha`, `beta`, `useHeuristic` are optional (defaults 3, 0.7, 0.3, true). **Python applies the held-skill rule (5.2.5).**

**Response from API-P-1:**
```json
{
  "algorithm": "a_star",
  "stats": { "statesExpanded": 412, "elapsedMs": 38 },
  "paths": [
    { "rank": 1, "type": "primary", "totalLearningCost": 60, "marketDemandAvg": 0.675, "compositeScore": 0.744,
      "steps": [ { "skillId": "<ObjectId>", "order": 1, "fromRank": 0, "toRank": 1, "estCost": 12.5,
                   "rationale": "Chosen for 'BI tool' (Tableau, 5h cheaper than Excel → Power BI)" } ] }
  ]
}
```

The Python service never touches `users` or `computed_paths` — the Node.js Web/API service owns all persistence. This makes D3 (independently testable component) concretely true: it can be `curl`'ed directly with a raw skill-ID list, on its own port, with only the `X-Internal-Key` header and no user/session context.

### 4.3 Path-Computation Algorithm (API-P-1)

1. **Build the search graph.** From the in-memory `networkx.DiGraph` of `prerequisite_of` edges only (co-requisites excluded). Each node has `estHours` and `marketDemand`.
2. **Apply the held-skill rule.** A requirement is already *met* if some option in `anyOf` is held at rank ≥ `minRank`. A skill is *known* (enough to act as a prerequisite) if held at rank ≥ 1.
3. **Relevant skills `R`.** For each option of every unmet requirement: the option itself plus its prerequisite ancestors (`networkx.ancestors`), stopping at skills that are already known. Only skills in `R` are ever considered.
4. **Target rank per skill.** `t(s)` = the requirement's `minRank` if *s* is an option of an unmet requirement (the highest one if it appears in several), else `1` (prerequisites only need beginner level). Step cost = `estHours(s) × (t(s) − heldRank(s)) / 2`.
5. **State-space search.**
   - *State* = the set `L` of skills learned so far in the plan (the user's held skills are fixed context).
   - *Move* = add one skill `s ∈ R \ L` that is *unlocked*: all mandatory prerequisites known, and ≥1 prerequisite known from each `group`. A skill the user already knows at a lower rank (an upgrade) is always unlocked.
   - *Goal* = every requirement met. Goal states are recorded but not expanded further.
   - *Heuristic* `h(L)` = sum of step costs of unmet **single-option** requirements. Each of these must be learned in any solution and each step learns one skill, so `h` never overestimates (admissible), and one step lowers `h` by at most that step's cost (consistent).
   - *Dijkstra mode*: `h = 0`, same code — used as the evaluation baseline for search efficiency.
6. **Primary + alternatives.** With a consistent heuristic, goal states are popped in increasing cost order. Keep popping until `3k` goal states are collected or the queue is empty, **discarding any goal set that is a strict superset of one already found** (it only adds an unnecessary skill). Score each candidate: `compositeScore = α·(cost / maxCost) + β·(1 − marketDemandAvg)`; sort ascending; return the top *k* (rank 1 = primary).
7. **Step order.** For each returned skill set, order the steps by `networkx.lexicographical_topological_sort` on the induced prerequisite subgraph, breaking ties by lower `estCost` first. Every returned path passes `validate_order()`: for each step, all of its mandatory prerequisites and ≥1 per group are held or appear at an earlier step.
8. **Size guard.** If more than **200,000** states are expanded, stop and return a single path: all unmet requirements (cheapest option per OR-group) plus their unknown prerequisites (cheapest option per prerequisite group), ordered as in step 7, with `algorithm: "greedy_fallback"`.

---

## PART 5 — SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

### 5.1 Introduction

**5.1.1 Purpose**
This SRS defines the functional and non-functional requirements for SKILLORA, a personalized upskilling-path recommendation system that models skills as a knowledge graph and computes optimized learning sequences via weighted shortest-path (A\*) search.

**5.1.2 Scope**
SKILLORA will allow registered users to declare their current skills and a target job role, and receive a computed, prerequisite-respecting, minimum-effort learning roadmap with ranked alternatives, visualized interactively, with progress tracking that triggers recomputation. It excludes: actual course/content delivery (SKILLORA recommends *what* to learn, not *how* — no embedded courseware); automated job-market data scraping at scale in v1 (`marketDemand` scores are curated/seeded, not live-scraped); and **password reset / forgot-password flow** (out of scope for v1 — users who forget their password must contact an admin or re-register).

**5.1.3 Definitions**
- *Skill node*: an entry in the graph representing one learnable competency, with `estHours` and `marketDemand`.
- *Learning cost*: estimated hours for a step, `estHours × (toRank − fromRank) / 2`.
- *OR-group*: a role requirement (`anyOf`) or a set of prerequisite edges (`group`) where any one member suffices.
- *Path*: an ordered sequence of learning steps from the user's current state to a state that meets every role requirement.
- *Composite score*: `α·(cost / maxCost) + β·(1 − marketDemandAvg)` used to rank paths; defaults `α=0.7, β=0.3`; lower is better.
- *Held skill*: for a role requirement, user rank ≥ `minProficiency` rank; for a prerequisite, user rank ≥ 1 (beginner=1, intermediate=2, advanced=3).

**5.1.4 References**
Objectives O1–O6 and Deliverables D1–D7 (Parts 1–2); MongoDB, Express, React, Node.js, Python, FastAPI, NetworkX documentation; Russell & Norvig, *Artificial Intelligence: A Modern Approach* (A\* search, admissible/consistent heuristics).

### 5.2 Overall Description

**5.2.1 Product Perspective**
SKILLORA is a new, standalone system. The MERN stack covers all user-facing features (auth, profile, roadmap UI, progress, admin). A Python/FastAPI/NetworkX microservice handles all graph computation internally, communicating with the Node.js Web/API service over an internal REST call. Python is used for this one component because NetworkX provides mature, well-tested graph utilities (ancestors, topological sort, cycle detection) and keeps the algorithmic core testable in isolation. It is not a plug-in to an existing LMS.

**5.2.2 Product Functions (Summary)**
1. User registration/authentication (with server-side logout)
2. Skill-profile capture with typeahead autocomplete (P3)
3. Target-role selection with has/needs comparison (P4)
4. Path computation — primary + alternatives (P5, API-P-1)
5. Visual roadmap + graph exploration with node-click detail (P5, P6)
6. Progress tracking with recomputation and path history (P8)
7. Admin curation of the skill graph (P10)
8. Evaluation/benchmarking via seed script (D6, DB-6)

**5.2.3 User Classes and Characteristics**
- **Learner (primary user):** student/early-career professional, no technical graph-theory knowledge assumed; needs simple proficiency self-assessment and plain-language roadmap.
- **Admin/Curator:** maintains skill/role dataset; needs CRUD access and basic graph-sanity feedback (e.g., orphan nodes, cycles — API-P-3 via API-N-31).
- **Evaluator (project stakeholder, e.g., reviewer/examiner):** consumes D6's evaluation report, not necessarily the live app.

**5.2.4 Operating Environment**
Node.js ≥18 for the Web/API service; Python ≥3.11 for the Path-Computation microservice (uses `fastapi`, `networkx`, `pymongo`); MongoDB ≥6; React ≥18 SPA served to modern evergreen browsers (Chrome/Firefox/Edge/Safari, last 2 versions). No native mobile app in v1 (responsive web only).

**5.2.5 Design and Implementation Constraints**
- Path computation must respect prerequisite ordering strictly — a skill cannot appear before an unmet prerequisite. This is guaranteed by the search (a skill is only learnable once unlocked) and checked on every output by `validate_order()`, not left to cost values.
- `corequisite_with` edges never affect computation.
- Graph size bounded to 80–120 nodes for v1 (performance and curation-quality constraint, per O1); the search is additionally capped at 200,000 expanded states (4.3 step 8).
- The Python Path-Computation service must remain statelessly callable, independent of any user session context (constraint enabling D3's independent testability); it authenticates callers only by `X-Internal-Key`.
- **Proficiency rule:** `beginner=1, intermediate=2, advanced=3`. A role requirement is *met* if the user holds some option at rank ≥ `minProficiency`. A prerequisite is *met* if the user holds it at any rank (≥ 1). Held rank = max over `currentSkills` ∪ `completedSkills`. Applied by API-P-1.
- **Cost fallback:** when a skill is created without `estHours`, the Node.js API defaults `estHours = baseDifficulty × 8`.
- **Composite score defaults:** `α=0.7, β=0.3` (speed-biased). Overridable per API-P-1 request body for flexibility in D6 evaluation scenarios.

**5.2.6 Assumptions and Dependencies**
- Users self-report proficiency honestly; system does not verify skill claims (assessment/testing is out of scope for v1).
- `estHours` and `marketDemand` are static/curated at launch, not live; the report notes this as a limitation (feeds into D6).
- The Python microservice is ideally deployed on the same host or private network as the Node.js service. Where the hosting platform gives it a public URL, the `X-Internal-Key` check is the access control.

### 5.3 Specific Requirements (Functional)

| ID | Requirement | Source Page/API | Priority |
|---|---|---|---|
| FR-1 | System shall allow user registration with email + password, hashed at rest (bcrypt). | P2 / API-N-2 | Must |
| FR-2 | System shall allow login, issue a JWT with expiry set by `JWT_EXPIRES_IN` env var (default `7d`), and write a session record for server-side revocation. No refresh-token flow in v1. | P2 / API-N-3 | Must |
| FR-3 | System shall let a user search and select current skills (with typeahead on name/aliases) and assign a proficiency level from {beginner, intermediate, advanced}. | P3 / API-N-4, API-N-5 | Must |
| FR-4 | System shall let a user browse/search and select exactly one active target role at a time. | P4 / API-N-6–8 | Must |
| FR-5 | System shall compute a minimum-cost primary path (A\* over the state space, 4.3) that covers every unmet role requirement and excludes skills the user already holds per the proficiency rule in 5.2.5. | P5 / API-N-9, API-P-1 | Must |
| FR-6 | Computed paths shall never place a skill before an unmet prerequisite of that skill; every returned path shall pass `validate_order()`. | P5 / API-P-1 | Must |
| FR-7 | System shall return up to 2 additional, non-dominated alternative paths ranked by composite score, whenever the role and graph contain OR-choices that allow them; otherwise the UI shall state that only one route exists. | P5, P7 / API-P-1 | Must |
| FR-8 | System shall render the selected path as an ordered, numbered visual roadmap, displaying estimated cost and rationale per step. | P5 | Must |
| FR-9 | System shall render the skill graph (full or path-scoped) as an interactive force-directed diagram with hoverable edge/node info and a clickable node detail panel. | P6 / API-N-11, API-N-4b | Should |
| FR-10 | User shall be able to mark a skill in the selected path as completed. | P8 / API-N-14 | Must |
| FR-11 | Marking a skill complete shall trigger recomputation of the remaining path within 2 seconds for graphs ≤120 nodes; if recomputation fails, the completion shall still be saved and the path marked stale. | P8 / API-N-14, API-P-1 | Must |
| FR-12 | Prior computed-path documents shall be archived (not deleted) on recomputation, to preserve history. | P5, P8 / DB-5 | Should |
| FR-13 | Admin users shall be able to create/edit/delete skill nodes, edges and roles without direct DB access, with the cascade/block rules in P10. | P10 / API-N-18–25, API-N-29, API-N-30 | Should |
| FR-14 | Admin edge writes shall be validated server-side to reject self-loops, duplicates and cycles in the `prerequisite_of` subgraph. | P10 / API-N-21, API-N-22 | Must |
| FR-15 | The Python Path-Computation service shall be callable independently of the web app (no user-session coupling; `X-Internal-Key` only), for testing/demo purposes, on its own port. | API-P-1, API-P-3–5 | Must |
| FR-16 | Evaluation scenarios shall be populated via `scripts/seed-eval.js` (not via UI), storing human-benchmark vs. system vs. generic-baseline outputs and metrics in DB-6. | DB-6 / D6 | Should |
| FR-17 | User shall be able to select which ranked path is "active" without triggering a recompute. | P7 / API-N-13 | Should |
| FR-18 | System shall expose a single endpoint (`GET /api/users/me`) returning the full current-user profile for use by any page needing "what does this user already have." | P4, P5, P7, P9 / API-N-26 | Must |
| FR-19 | System shall let a user view a history of past (archived) computed paths, distinct from the currently active one. | P8 / API-N-27 | Should |
| FR-20 | System shall allow a user to log out, invalidating their session server-side regardless of JWT expiry. | P9 / API-N-28 | Must |
| FR-21 | Any change to a path's inputs (user skills, target role, admin graph/role edits) shall mark the affected active path `stale`, and the dashboard shall recompute stale paths on next load. | P3, P4, P5, P9, P10 / API-N-5, API-N-8, API-N-9, API-N-15, API-N-16, API-N-18–25, API-N-29 | Must |

### 5.4 Non-Functional Requirements

- **Performance:** Path computation (primary + alternatives) shall complete in <2s server-side for graphs up to 120 nodes / 200 edges, across the API-N → API-P round trip. The 200,000-state cap bounds the worst case.
- **Security:**
  - Passwords hashed with bcrypt (min 10 rounds).
  - JWTs expire per `JWT_EXPIRES_IN` env var; session records in DB-7 enable server-side revocation on logout; a TTL index removes expired sessions.
  - Admin routes role-gated server-side (`users.role === "admin"`) — not just hidden in UI.
  - Auth endpoints (`/api/auth/register`, `/api/auth/login`) shall be rate-limited to ≤10 requests/minute per IP (via `express-rate-limit` middleware) to mitigate brute-force attacks.
  - The Python Path-Computation service requires `X-Internal-Key` (env `INTERNAL_API_KEY`, shared only between the two services) on all endpoints except `/health`, and is kept on a private network where the hosting platform allows it.
- **Usability:** Skill-selection and role-selection flow (O2) completable in under 2 minutes by a first-time user with no onboarding tutorial required.
- **Reliability:** Path-Computation service health-checked (**API-P-4**). If it is unreachable, the Web/API service shows the last computed path (marked stale) and retries on the next dashboard load; completions are never lost (FR-11).
- **Maintainability:** Graph dataset versioned as JSON (`data/v1/`); admin CRUD avoids the need for manual DB migrations for routine skill/role additions; the Python service reloads its in-memory graph via API-P-5 after admin writes.
- **Scalability (documented, not built for v1):** Separating the Python computation service from the Node.js web service means the graph-computation workload can be scaled or replaced independently later (e.g., behind a task queue with multiple workers) — noted in D6's limitations/scaling discussion.

### 5.5 External Interface Requirements

- **UI:** React SPA, responsive down to tablet width (768px+); roadmap and graph views must remain legible at 768px+ width.
- **API:** All Web/API-service endpoints under `/api/*`, JSON request/response, documented via OpenAPI/Swagger (D7).
- **Internal service interface:** Node.js Web/API service → Python Path-Computation service over HTTP (`/compute/*`, `/graph/*`, `/health`), authenticated by `X-Internal-Key`, not called by the browser; request/response schemas documented in D7 (FastAPI generates the OpenAPI spec automatically).

---

## Summary Traceability Table

| Objective | Deliverable(s) | Primary Page(s) | Primary API(s) | Primary DB Collection(s) |
|---|---|---|---|---|
| O1 | D1 | P6, P10 | API-N-11, API-N-18–25, API-N-29–31, API-P-3, API-P-5 | DB-2, DB-3, DB-4 |
| O2 | D2 | P2, P3, P4 | API-N-2–8, API-N-26 | DB-1, DB-2, DB-4 |
| O3 | D3 | P5 | API-N-9, API-N-10, API-P-1 | DB-2, DB-3, DB-4, DB-5 |
| O4 | D3 | P5, P7 | API-N-12, API-N-13, API-P-1 | DB-5, DB-1 |
| O5 | D4, D5 | P5, P6, P8 | API-N-9–14, API-N-27 | DB-5, DB-1 |
| O6 | D6 | (seed script / offline) | `scripts/seed-eval.js` → API-P-1 (A\* and Dijkstra modes) | DB-6 |
