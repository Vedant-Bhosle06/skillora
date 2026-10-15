# SKILLORA — Software Requirements Specification

| | |
|---|---|
| **Version** | 4.1 |
| **Status** | Approved |
| **Last updated** | 2026-10-15 |
| **Related** | [PRD.md](PRD.md) (scope, goals) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DATA_MODEL.md](DATA_MODEL.md) · [API.md](API.md) · [ALGORITHM.md](ALGORITHM.md) |

Identifiers used throughout the documentation: objectives **O1–O6** and deliverables **D1–D7** ([PRD](PRD.md)), pages **P1–P10** ([API §4](API.md#4-page--endpoint-map)), endpoints **API-N-\*** / **API-P-\*** ([API](API.md)), collections **DB-1–DB-7** ([DATA_MODEL](DATA_MODEL.md)), functional requirements **FR-\*** and non-functional requirements **NFR-\*** (this document).

## 1. Introduction

### 1.1 Purpose

This SRS defines the functional and non-functional requirements of SKILLORA, a personalised upskilling-path recommendation system that models skills as a knowledge graph and computes optimised learning sequences with weighted shortest-path (A\*) search.

### 1.2 Scope

SKILLORA lets registered users declare their current skills and one target role and receive a computed, prerequisite-respecting, minimum-effort learning roadmap with ranked alternatives, visualised interactively, with progress tracking that triggers recomputation. In-scope and out-of-scope capabilities are listed in [PRD §5](PRD.md#5-scope).

### 1.3 Definitions

| Term | Definition |
|---|---|
| Skill (node) | One learnable competency, with `estHours` and `marketDemand` |
| Proficiency rank | `beginner = 1`, `intermediate = 2`, `advanced = 3`; 0 = not known |
| Learning cost | Hours for a step: `estHours × (toRank − fromRank) / 2` |
| OR-group | A role requirement with several `anyOf` options, or prerequisite edges sharing a `group`; any one member suffices |
| Held skill | For a role requirement: user rank ≥ `minProficiency`. For a prerequisite: user rank ≥ 1. Held rank = max over `currentSkills` ∪ `completedSkills` |
| Path | An ordered sequence of learning steps from the user's current state to a state meeting every role requirement |
| Composite score | `α·(cost / maxCost) + β·(1 − marketDemandAvg)`, defaults `α = 0.7`, `β = 0.3`; lower is better |
| Stale path | A stored path whose inputs have changed or whose last recompute failed |

### 1.4 References

[PRD](PRD.md); MongoDB, Express, React, Node.js, Python, FastAPI and NetworkX documentation; Russell & Norvig, *Artificial Intelligence: A Modern Approach* (A\* search, admissible and consistent heuristics).

## 2. Overall description

### 2.1 Product perspective

SKILLORA is a new, standalone system. The MERN application covers every user-facing feature; a Python/FastAPI/NetworkX service performs graph computation internally and is called only by the Node API ([ADR-0001](adr/0001-separate-python-path-service.md)). It is not a plug-in to an existing learning platform.

### 2.2 Product functions

1. Registration, login and server-side logout
2. Skill-profile capture with typeahead (P3)
3. Target-role selection with a has/needs comparison (P4)
4. Path computation: primary path and ranked alternatives (P5, P7)
5. Visual roadmap and skill-graph exploration (P5, P6)
6. Progress tracking with recomputation and history (P8)
7. Admin curation of the skill graph (P10)
8. Offline evaluation and benchmarking (D6)

### 2.3 User classes

| Class | Characteristics |
|---|---|
| Learner | Student or early-career professional; no graph-theory knowledge; needs plain-language guidance |
| Admin / curator | Maintains the dataset; needs safe CRUD and graph-health feedback |
| Evaluator | Reviews the D6 report and the demo |

### 2.4 Operating environment

Node.js ≥ 18 (API), Python ≥ 3.11 (path service), MongoDB ≥ 6 (Atlas), a React single-page application in current evergreen browsers (Chrome, Firefox, Edge, Safari; last two versions). Responsive web from 768 px; no native mobile app.

### 2.5 Design and implementation constraints

- **C-1** A skill may never appear before an unmet prerequisite; guaranteed by the search and checked by `validate_order()` on every returned path.
- **C-2** `corequisite_with` edges never affect computation.
- **C-3** The graph holds 80–120 skills in v1; the search is capped at 200 000 expanded states.
- **C-4** The path service is stateless and callable without any user session, authenticated only by `X-Internal-Key`.
- **C-5** The proficiency rule of §1.3 is applied by the path service (API-P-1).
- **C-6** A skill created without `estHours` gets `baseDifficulty × 8`.
- **C-7** Ranking weights default to `α = 0.7`, `β = 0.3` and may be overridden per API-P-1 request.
- **C-8** The Node API is the only writer to the database; the path service reads `skills` and `skill_edges` only.

### 2.6 Assumptions and dependencies

- Users self-report proficiency honestly; skills are not verified.
- `estHours`, `marketDemand` and `demandScore` are curated, static estimates in v1.
- The path service runs on the same host or private network as the API where possible; otherwise `X-Internal-Key` is the access control.

## 3. Functional requirements

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-1 | The system shall allow registration with email and password, hashing passwords with bcrypt. | P2 / API-N-2 | Must |
| FR-2 | The system shall allow login, issuing a JWT whose lifetime is set by `JWT_EXPIRES_IN` (default 7 days) and recording a server-side session for revocation. No refresh tokens in v1. | P2 / API-N-3 | Must |
| FR-3 | The system shall let a user search skills by word prefix on name and aliases and assign each selected skill a proficiency of beginner, intermediate or advanced. | P3 / API-N-4, N-5 | Must |
| FR-4 | The system shall let a user browse roles and select exactly one active target role at a time. | P4 / API-N-6–8 | Must |
| FR-5 | The system shall compute a minimum-cost primary path ([ALGORITHM](ALGORITHM.md)) that meets every unmet role requirement and excludes skills already held per §1.3. | P5 / API-N-9, API-P-1 | Must |
| FR-6 | Computed paths shall never place a skill before an unmet prerequisite; every returned path shall pass `validate_order()`. | P5 / API-P-1 | Must |
| FR-7 | The system shall return up to 2 additional non-dominated alternative paths, costing at most `costBoundRatio` (default 1.5) × the cheapest, ranked by composite score, whenever the role and graph allow; otherwise exactly one path is returned. | P5, P7 / API-P-1 | Must |
| FR-8 | The system shall present the selected path as an ordered, numbered roadmap with estimated cost and rationale per step. | P5 | Must |
| FR-9 | The system shall present the skill graph (full or path-scoped) as an interactive force-directed diagram with edge/node information and a node detail panel. | P6 / API-N-11, N-4b | Should |
| FR-10 | A user shall be able to mark a skill of the selected path as completed; completing the same skill twice for the same role shall be rejected. | P8 / API-N-14 | Must |
| FR-11 | Marking a skill complete shall recompute the remaining path within 2 s for graphs ≤ 120 skills; if recomputation fails, the completion shall still be saved and the path marked stale. | P8 / API-N-14, API-P-1 | Must |
| FR-12 | Previous computed paths shall be archived, not deleted, on recomputation. | P5, P8 / DB-5 | Should |
| FR-13 | Admins shall be able to create, edit and delete skills, edges and roles without direct database access, subject to the cascade and block rules of [API §2](API.md#admin-authenticated--admin). | P10 / API-N-18–25, N-29, N-30 | Should |
| FR-14 | Admin edge writes shall reject self-loops, duplicates and any cycle in the `prerequisite_of` subgraph. | P10 / API-N-21, N-22 | Must |
| FR-15 | The path service shall be callable independently of the web application (no user session; `X-Internal-Key` only) on its own port. | API-P-1, P-3–P-6 | Must |
| FR-16 | Evaluation scenarios shall be produced by `scripts/seed-eval.js`, storing benchmark, system and baseline outputs with metrics in DB-6. | D6 / DB-6 | Should |
| FR-17 | A user shall be able to choose which ranked path is active without triggering a recompute. | P7 / API-N-13 | Should |
| FR-18 | The system shall provide one endpoint returning the full current-user profile. | P4, P5, P7, P9 / API-N-26 | Must |
| FR-19 | The system shall let a user view past (archived) computed paths. | P8 / API-N-27 | Should |
| FR-20 | The system shall allow logout that invalidates the session server-side, regardless of token expiry. | P9 / API-N-28 | Must |
| FR-21 | Any change to a path's inputs (profile, target role, admin edits to the dataset) shall mark affected active paths stale; the dashboard shall recompute a stale or missing path on load. | P3, P4, P5, P9, P10 / API-N-5, N-8, N-9, N-15, N-16, N-18–25, N-29 | Must |
| FR-22 | When a user already meets every requirement of the target role, the system shall return a single empty path with cost 0. | P5 / API-P-1 | Should |
| FR-23 | After every admin write, the path service shall reload its in-memory graph so new computations use the current dataset. | P10 / API-P-5 | Must |

## 4. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Path computation (primary + alternatives) completes in < 2 s server-side for ≤ 120 skills / 200 edges, across the API → path-service round trip. |
| NFR-2 | Performance | The search is bounded by a 200 000-state cap. |
| NFR-3 | Security | Passwords hashed with bcrypt (≥ 10 rounds); never returned by the API. |
| NFR-4 | Security | Sessions revocable server-side; expired sessions removed by a TTL index. |
| NFR-5 | Security | Admin routes authorised server-side from `users.role` in the database, not only hidden in the UI. |
| NFR-6 | Security | Register and login rate-limited to ≤ 10 requests / minute / IP. |
| NFR-7 | Security | Every path-service endpoint except `/health` requires `X-Internal-Key`; the key never reaches the browser. |
| NFR-8 | Security | Secrets live only in git-ignored `.env` files; unexpected errors never expose internals to clients. |
| NFR-9 | Usability | A first-time user completes skill and role selection (O2) in under 2 minutes without a tutorial. |
| NFR-10 | Reliability | If the path service is unreachable, the API returns the last computed path marked stale and retries on the next dashboard load; completions are never lost. |
| NFR-11 | Reliability | Concurrent compute requests for one user produce a single result. |
| NFR-12 | Maintainability | The dataset is versioned JSON (`data/v1`) with an idempotent seed script; routine curation needs no manual migrations. |
| NFR-13 | Maintainability | Path-service tests run on in-memory fixture graphs with ≥ 80 % coverage (the gate in `pytest.ini` applies when run with `--cov`). |
| NFR-14 | Documentation | Both services are described by OpenAPI documents (Node `/api/docs`, FastAPI `/docs`). |
| NFR-15 | Scalability (documented, not built) | The path service can be scaled or replaced independently (task queue, workers, caching), as discussed in D6. |

## 5. External interface requirements

- **User interface.** React SPA, legible from 768 px width; roadmap and graph views remain usable at that width.
- **Public API.** All Node endpoints under `/api/*`, JSON, documented by OpenAPI ([API.md](API.md)).
- **Internal API.** Node → path service over HTTP (`/compute/*`, `/graph/*`, `/health`) with `X-Internal-Key`; FastAPI generates its OpenAPI document.

## 6. Traceability

| Objective | Deliverables | Pages | Endpoints | Collections | Requirements |
|---|---|---|---|---|---|
| O1 | D1 | P6, P10 | API-N-11, N-18–25, N-29–31, API-P-3, P-5 | DB-2, DB-3, DB-4 | FR-13, FR-14, FR-23, NFR-12 |
| O2 | D2 | P2, P3, P4 | API-N-2–8, N-26 | DB-1, DB-2, DB-4 | FR-1–4, FR-18, NFR-9 |
| O3 | D3 | P5 | API-N-9, N-10, API-P-1 | DB-2–DB-5 | FR-5, FR-6, FR-22, NFR-1, NFR-2 |
| O4 | D3 | P5, P7 | API-N-12, N-13, API-P-1 | DB-1, DB-5 | FR-7, FR-17 |
| O5 | D4, D5 | P5, P6, P8 | API-N-9–14, N-27 | DB-1, DB-5 | FR-8–12, FR-19, FR-21, NFR-10, NFR-11 |
| O6 | D6 | — (offline) | `seed-eval.js` → API-P-1, P-6 | DB-6 | FR-16 |
| All | D7 | — | — | — | NFR-14 |
