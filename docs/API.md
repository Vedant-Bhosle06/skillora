# SKILLORA — API Reference

| | |
|---|---|
| **Status** | Current (spec v4.1) |
| **Interactive docs** | Node API: `http://localhost:5000/api/docs` (raw: `/api/docs.json`) · Path service: `http://localhost:5001/docs` |
| **Related** | [DATA_MODEL.md](DATA_MODEL.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [ALGORITHM.md](ALGORITHM.md) |

Two services expose APIs. **API-N-\*** endpoints belong to the Node API (`skillora-api`), the only API the browser calls. **API-P-\*** endpoints belong to the internal path service (`skillora-path-service`). The OpenAPI documents are the field-level reference; this page explains conventions, behaviour and how the pages use the endpoints.

---

## 1. Conventions (Node API)

| Topic | Rule |
|---|---|
| Base URL | `http://localhost:5000` in development; all routes start with `/api` |
| Format | JSON request and response bodies (`Content-Type: application/json`) |
| Authentication | `Authorization: Bearer <token>` from `POST /api/auth/login`. Tokens last `JWT_EXPIRES_IN` (default 7 days) and stop working immediately after logout |
| Admin | Routes under `/api/admin` additionally require `users.role === "admin"` (read from the database) |
| IDs | `_id` / `…Id` fields and `:id` parameters are MongoDB ObjectIds (24 hex characters); a malformed id returns `400 Invalid id` |
| Errors | Always `{ "error": "<message>" }` |
| Rate limit | `POST /api/auth/register` and `/login`: 10 requests per minute per IP (`429` when exceeded) |
| CORS | Allowed origin: `CLIENT_ORIGIN` (default `http://localhost:5173`) |

### Status codes

| Code | Meaning |
|---|---|
| 200 / 201 | Success / created |
| 202 | Accepted, follow-up pending (skill completion saved, path recompute pending) |
| 400 | Invalid input (missing field, bad id, value outside an enum, rule violated) |
| 401 | Missing, invalid, expired or logged-out token; wrong credentials at login |
| 403 | Authenticated but not an admin |
| 404 | Resource not found, or unknown `/api/*` route |
| 409 | Conflict: duplicate (email, slug, edge), cycle, already completed, delete blocked |
| 429 | Rate limit exceeded |
| 503 | Path service unavailable or failing |
| 500 | Unexpected server error (details are logged, not returned) |

---

## 2. Endpoint catalog (Node API)

### Public

| ID | Method & path | Body / query | Success | Errors |
|---|---|---|---|---|
| API-N-1 | `GET /api/stats/public` | — | `{ skillCount, roleCount }` | — |
| API-N-2 | `POST /api/auth/register` | `{ name, email, password }` | `201 { message, userId }` (no token) | 400, 409 email taken, 429 |
| API-N-3 | `POST /api/auth/login` | `{ email, password }` | `{ token, user: { id, name, email, role } }` | 400, 401, 429 |
| API-N-4 | `GET /api/skills` | `?search=` optional | Array of skills. Without `search`: all skills. With `search`: case-insensitive word-prefix match on name and aliases, sorted by name, max 20 | — |
| API-N-4b | `GET /api/skills/:id` | — | The skill plus `edges[]` (every edge where it is source or target) | 400, 404 |
| API-N-6 | `GET /api/roles` | `?sort=demand` optional | Array of roles; `requiredSkills[].anyOf` are plain ids | — |
| API-N-7 | `GET /api/roles/:id` | — | The role; each requirement also has `anyOfSkills: [{ _id, slug, name, estHours, marketDemand }]` | 400, 404 |

### Account and profile (authenticated)

| ID | Method & path | Body | Success | Errors | Side effect |
|---|---|---|---|---|---|
| API-N-28 | `POST /api/auth/logout` | — | `{ message }` | 401 | Session deleted |
| API-N-26 | `GET /api/users/me` | — | User without `passwordHash`; `currentSkills[].skillId` and `completedSkills[].skillId` are populated `{ _id, slug, name, category }`; `targetRoleId` is populated `{ _id, slug, title }` or `null` | 401 | — |
| API-N-5 | `POST /api/users/me/skills` | `{ skills: [{ skillId, proficiency }] }` | `{ message }` | 400 (not an array, bad id, bad proficiency, duplicate skill, unknown skill) | **Replaces** `currentSkills`; path → stale |
| API-N-8 | `POST /api/users/me/target-role` | `{ roleId }` | `{ message }` | 400, 404 role | Path → stale |
| API-N-15 | `PATCH /api/users/me/skills/:id` | `{ proficiency }` | `{ message }` | 400, 404 skill not in profile | Path → stale |
| API-N-16 | `DELETE /api/users/me/skills/:id` | — | `{ message }` | 400 | Removed from `currentSkills`; path → stale |
| API-N-17 | `DELETE /api/users/me` | — | `{ message }` | 401 | Deletes the user, their sessions and their computed paths |

`proficiency` is one of `beginner`, `intermediate`, `advanced`.

### Paths and progress (authenticated)

| ID | Method & path | Body | Success | Errors |
|---|---|---|---|---|
| API-N-10 | `GET /api/paths/active` | — | The latest non-archived `computed_paths` document (`status` is `active` or `stale`) | 404 no path yet |
| API-N-9 | `POST /api/paths/compute` | — | The new `computed_paths` document | 400 no target role, 404 target role deleted, 503 path service |
| API-N-12 | `GET /api/paths/:pathDocId/alternatives` | — | `{ paths, algorithm, stats }` of one of the user's documents | 400, 404 |
| API-N-13 | `POST /api/paths/select` | `{ rank }` (integer ≥ 1; numeric strings accepted) | `{ message }` — sets `users.selectedPathRank`, no recompute | 400 invalid or unknown rank, 404 no active document |
| API-N-14 | `POST /api/users/me/skills/complete` | `{ skillId }` | `200 { message, path }` (new document), or `202 { recomputePending: true, message }` | 400 (bad id, no target role, no active path, skill not in the selected path), 409 already completed for this role |
| API-N-14b | `DELETE /api/users/me/skills/complete/:skillId` | — | `200 { message, path }` (new document), or `202 { recomputePending: true, message }` | 400 (bad id, no target role), 404 user missing or skill not completed for the current target role |
| API-N-27 | `GET /api/paths/history` | — | Archived documents, newest first | — |
| API-N-11 | `GET /api/graph` | `?scope=full` (default) or `?scope=path` | `{ nodes: [{ _id, slug, name, category, estHours, marketDemand }], edges: [{ source, target, type, group }] }` | 401 |

### Admin (authenticated + admin)

| ID | Method & path | Body | Success | Errors |
|---|---|---|---|---|
| API-N-18 | `POST /api/admin/skills` | Skill fields (`slug`, `name`, `category`, `baseDifficulty`, `marketDemand` required; `estHours` defaults to `baseDifficulty × 8`) | `201` skill | 400 validation, 409 duplicate slug |
| API-N-19 | `PATCH /api/admin/skills/:id` | Fields to change | Updated skill | 400, 404 |
| API-N-20 | `DELETE /api/admin/skills/:id` | — | `{ message }`; deletes the skill's edges and removes it from every user's profile | 409 still required by a role |
| API-N-30 | `GET /api/admin/edges` | `?skillId=` optional | Array of edges (raw `sourceSkillId` / `targetSkillId`) | — |
| API-N-21 | `POST /api/admin/edges` | `{ sourceSkillId, targetSkillId, type, group?, source? }` | `201` edge | 400 (missing ids, bad type, self-loop, `group` on a corequisite), 404 skill, 409 cycle or duplicate |
| API-N-22 | `PATCH /api/admin/edges/:id` | Any of `sourceSkillId`, `targetSkillId`, `type`, `group`, `source` | Updated edge | as API-N-21, 404 edge |
| API-N-23 | `DELETE /api/admin/edges/:id` | — | `{ message }` | 404 |
| API-N-24 | `POST /api/admin/roles` | Role fields | `201` role | 400, 409 duplicate slug |
| API-N-25 | `PATCH /api/admin/roles/:id` | Fields to change | Updated role | 400, 404 |
| API-N-29 | `DELETE /api/admin/roles/:id` | — | `{ message }`; users targeting it get `targetRoleId = null` and their paths archived | 404 |
| API-N-31 | `GET /api/admin/graph/metrics` | — | Graph health from API-P-3 (fields below) | 503 path service |

Every admin write (API-N-18–25, N-29) reloads the path service's graph and marks every active path `stale`. All admin routes also return 401 / 403 as applicable.

---

## 3. Behaviour that clients must handle

**Dashboard load.** Call `GET /api/paths/active`. On `404`, or when `status` is `"stale"`, call `POST /api/paths/compute`. The server never recomputes on its own: a stale path stays stale until a client calls compute ([ADR-0005](adr/0005-versioned-computed-paths.md)).

**Selected path.** The document holds up to 3 ranked paths. The one the user chose is `paths.find(p => p.rank === user.selectedPathRank)`; `selectedPathRank` resets to 1 after every recompute.

**Single route and "already qualified".** `paths.length === 1` means only one route exists for this profile. `paths[0].steps.length === 0` (cost 0) means the user already meets every requirement.

**Step data.** Steps contain `skillId` only (no names). Resolve names from `GET /api/skills` (all skills) or the graph endpoint. `fromRank → toRank` shows whether a step is a new skill (`fromRank` 0) or an upgrade; `estCost` is in hours; `rationale` is a ready-to-show sentence.

**Completion.** After `200`, the response's `path` is the new current document; the completed skill is no longer one of its steps. The list of completed skills is `users.completedSkills` (filter by `targetRoleId` for the current role). After `202`, the completion is saved and the path is `stale`; call `POST /api/paths/compute` later to refresh it.

**Progress ratio (spec rule).** `completedForRole / (completedForRole + remaining steps of the selected path)`, where `completedForRole` counts `completedSkills` whose `targetRoleId` equals the user's current target role.

**Graph scope.** `scope=path` returns the steps of the selected path plus their direct prerequisites, and only edges between those nodes. If the user has no path yet, it returns the full graph.

**Profile replacement.** `POST /api/users/me/skills` replaces the whole list; send every skill the user should keep.

---

## 4. Page → endpoint map

| Page | Endpoints |
|---|---|
| P1 Landing `/` | N-1 |
| P2 Register / Login | N-2, N-3 |
| P3 Skill profile `/onboarding/skills` | N-4, N-5 |
| P4 Target role `/onboarding/role` | N-6, N-7, N-8, N-26 |
| P5 Dashboard `/dashboard` | N-10, N-9, N-26 |
| P6 Graph explorer `/graph` | N-11, N-4b |
| P7 Alternatives `/dashboard/alternatives` | N-12, N-13, N-26 |
| P8 Progress `/progress` | N-10, N-14, N-27 |
| P9 Settings `/settings` | N-26, N-15, N-16, N-8, N-17, N-28 |
| P10 Admin `/admin/*` | N-4, N-6, N-18–25, N-29, N-30, N-31 |

---

## 5. Path service (internal)

Called only by the Node API and the offline scripts. Every endpoint except `/health` requires `X-Internal-Key: <INTERNAL_API_KEY>` ([ADR-0007](adr/0007-internal-api-key.md)).

| ID | Method & path | Purpose |
|---|---|---|
| API-P-1 | `POST /compute/paths` | Primary path + ranked alternatives with rationales ([ALGORITHM.md](ALGORITHM.md)) |
| API-P-3 | `GET /graph/metrics` | Graph health: `nodeCount`, `prerequisiteEdgeCount`, `corequisiteEdgeCount`, `groupCount`, `isDAG`, `cycle` (null when acyclic), `orphanCount`, `orphans`, `avgDegree`, `roots`, `maxDepth` |
| API-P-4 | `GET /health` | `{ status, graphLoaded, nodes, edges }` (no key) |
| API-P-5 | `POST /graph/reload` | Re-read skills and edges from MongoDB; the previous graph is kept if loading fails |
| API-P-6 | `POST /graph/validate-order` | Count prerequisite-order violations in a list of steps (used by `seed-eval.js`) |

API-P-2 was merged into API-P-1 in spec v4.0 ([ADR-0006](adr/0006-single-compute-endpoint.md)).

### API-P-1 request

```json
{
  "heldSkills":   [ { "skillId": "<ObjectId>", "rank": 1 } ],
  "requirements": [
    { "anyOf": ["<ObjectId>"], "minRank": 2 },
    { "anyOf": ["<powerbi>", "<tableau>"], "minRank": 1, "label": "BI tool" }
  ],
  "k": 3, "alpha": 0.7, "beta": 0.3, "useHeuristic": true,
  "costBoundRatio": 1.5, "heuristic": "closure"
}
```

| Field | Default | Notes |
|---|---|---|
| `heldSkills` | `[]` | Node sends the max rank per skill over `currentSkills` ∪ `completedSkills`; unknown ids are ignored |
| `requirements` | `[]` | One entry per role requirement; unknown ids → 422 |
| `k` | 3 | 1–5 paths |
| `alpha`, `beta` | 0.7, 0.3 | Ranking weights |
| `useHeuristic` | `true` | `false` = Dijkstra |
| `costBoundRatio` | 1.5 | Alternatives cost at most this × the cheapest (≥ 1) |
| `heuristic` | `"closure"` | or `"simple"` |

The Node API sends `heldSkills`, `requirements`, `k`, `alpha`, `beta` and `useHeuristic`.

### API-P-1 response

```json
{
  "algorithm": "a_star",
  "stats": { "statesExpanded": 37, "statesToPrimary": 16, "elapsedMs": 2.1, "capped": false },
  "paths": [
    { "rank": 1, "type": "primary", "totalLearningCost": 60, "marketDemandAvg": 0.675, "compositeScore": 0.744,
      "steps": [ { "skillId": "<ObjectId>", "order": 1, "fromRank": 0, "toRank": 1, "estCost": 12.5,
                   "rationale": "Chosen for 'BI tool' …" } ] }
  ]
}
```

### Path service errors

| Code | When | Node API maps it to |
|---|---|---|
| 403 | Missing or wrong `X-Internal-Key` | 503 (logged) |
| 422 | Invalid body, or a requirement references an unknown skill id | 503 (logged) |
| 503 | Graph not loaded, or reload failed | 503 |
| 500 | A computed path failed `validate_order()` (internal guard) | 503 (logged) |

---

## 6. Known issues

| Issue | Effect | Planned fix |
|---|---|---|
| Admin role create/update does not check that `anyOf` skill ids exist | Computes for that role fail with 503 (the path service answers 422) | Validate requirement ids in API-N-24 / N-25 |
| `DELETE /api/admin/skills/:id` returns 200 for an id that does not exist | Misleading success message | Return 404 when nothing was deleted |
