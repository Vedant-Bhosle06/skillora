# Changelog

All notable changes to SKILLORA's specification and design. Versions refer to the documentation set (spec v1.0–v4.2); code changes are traceable through git history. Each entry records the issue found and the fix applied. Design rationale for major changes is in the [ADRs](adr/README.md).

## v4.2 — 2026-10-20

Transit frontend redesign, undo for completed skills, and free-tier deployment configuration.

| # | Issue found | Fix applied |
|---|---|---|
| 1 | The frontend still used the original purple interface, with a progress ring and a generic dashboard. | Redesigned as **Transit** ([DESIGN.md](../DESIGN.md)): the path is a metro line, Progress has a journey line, the graph uses the same palette, and light and dark themes are both supported. [USER_GUIDE.md](USER_GUIDE.md) reworded to match. |
| 2 | A skill marked complete by mistake could not be reversed. | Added **API-N-14b** `DELETE /api/users/me/skills/complete/:skillId` (same 200 / 202 shapes as API-N-14, 404 if not completed). The client offers **Undo** in the "marked complete" message and **Mark as not done** on completed skills. |
| 3 | three.js shipped in the client bundle only for the landing hero. | Removed; the hero is built in code with SVG, with a still version for reduced motion. |
| 4 | Heavy routes (graph, admin, progress) were in the main bundle. | Lazy-loaded per route. |
| 5 | Graph hover gave no reason for a locked skill and was not keyboard accessible. | Hover cards say "Locked: still needs …"; nodes are focusable and show the card on focus. |
| 6 | No deployment configuration; CORS accepted a single origin; free hosting sleeps when idle. | `render.yaml` (two free Render web services), `skillora-client/vercel.json` (SPA rewrite, security headers), `CLIENT_ORIGIN` accepts a comma-separated list, the API binds to `$PORT`, `dnspython` added for Atlas `mongodb+srv` URIs. See [DEPLOYMENT.md](DEPLOYMENT.md). |
| 7 | A cold path service made the first compute fail or time out. | The API polls the path service `/health` with backoff (up to 60 s, honouring `PYTHON_TIMEOUT_MS`) before compute and pings it once at startup; the client pings `/api/stats/public` on the landing and auth pages and shows "Waking the planner" after 4 s of waiting. Client request timeout raised to 75 s (90 s for compute). |

## v4.1 — 2026-10-15

Integration of the path service with the Node API, and restructuring of the documentation.

| # | Issue found | Fix applied |
|---|---|---|
| 1 | Mongoose derived the collection names `skilledges`, `computedpaths` and `evaluationscenarios`, contradicting the data model (`skill_edges`, `computed_paths`, `evaluation_scenarios`). | Names pinned in the models; path-service default updated; existing collections renamed in place ([ADR-0011](adr/0011-explicit-collection-names.md)). |
| 2 | `computed_paths.stats` stored only `statesExpanded` and `elapsedMs`; the path service also returns `statesToPrimary` and `capped`, which were silently dropped. | Both fields added to DB-5. |
| 3 | The implemented search differs from spec v4.0 §4.3: closure heuristic, relevance pruning, a 1.5× near-optimal bound, and returning found plans when the cap is hit. | Adopted into the specification ([ALGORITHM.md](ALGORITHM.md), [ADR-0008](adr/0008-closure-heuristic-and-near-optimal-bound.md)). |
| 4 | Undefined behaviour when a user already meets every requirement. | One primary path with no steps and cost 0 (FR-22). |
| 5 | `POST /graph/validate-order` existed without an ID. | Documented as API-P-6. |
| 6 | Path-service error codes (403 / 422 / 503 / 500) were undocumented. | Documented in [API.md §5](API.md#5-path-service-internal). |
| 7 | Completing an already-completed skill returned 400 ("not in path") instead of 409, because the duplicate check ran after the path lookup. | Duplicate check moved first (FR-10). |
| 8 | Each graph reload opened a new MongoDB connection (≈ 13 s on slow-DNS networks), so reloads after admin writes timed out. | One client reused across reloads (≈ 0.27 s). |
| 9 | One 540-line specification mixed product requirements, design, data model, API, algorithm and history; scope was hard to find; no architecture document or decision records. | Split into [PRD](PRD.md), [SRS](SRS.md), [ARCHITECTURE](ARCHITECTURE.md), [DATA_MODEL](DATA_MODEL.md), [API](API.md), [ALGORITHM](ALGORITHM.md), this changelog and [ADRs](adr/README.md). All IDs (O, D, P, DB, API, FR) unchanged. |

## v4.0 — 2026-10-02

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
| 25 | `$text` search matches whole words only, so it cannot do prefix typeahead (`pyt` never finds Python). | Replaced the text index with a case-insensitive word-prefix match on `name` + `aliases` (DB-2, P3, API-N-4). |

## v3.0

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

## v2.0

| # | Issue Found | Fix Applied |
|---|---|---|
| 1 | API endpoints were inconsistently labeled — Python endpoints had formal IDs (`API-P-1`...), several Node endpoints didn't, and the traceability table cited IDs that were never defined anywhere else. | Every endpoint across both services now has a formal ID (`API-N-#`, `API-P-#`); traceability table updated to cite only IDs actually defined in Part 4. |
| 2 | `users.activePathId` pointed to a `computed_paths` document, but that document holds a *primary* path **plus** ranked alternatives — there was no field to record which specific ranked path the user picked. | Added `users.selectedPathRank` (defaults to `1`, the primary path). P7's "select alternative" API now correctly writes to this field. |
| 3 | No endpoint existed to read a user's own profile (`GET /api/users/me`) — needed by Role Selection's has/needs comparison, the Dashboard header, and Settings' edit forms. | Added **API-N-26**, referenced from P4, P5, P9; new **FR-18**. |
| 4 | No endpoint existed to fetch archived (past) `computed_paths` docs — API-N-10 only reads `status: active`, but the Progress page requires a path-history view. | Added **API-N-27** (`GET /api/paths/history`), referenced from P8; new **FR-19**. |
