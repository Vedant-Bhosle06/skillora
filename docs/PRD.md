# SKILLORA — Product Requirements Document

| | |
|---|---|
| **Product** | SKILLORA (Skill-Gap Navigator) |
| **Document owner** | Team SKILLORA (Members A, B, C) |
| **Status** | Approved for v1 |
| **Last updated** | 2026-10-15 |
| **Related** | [SRS.md](SRS.md) (detailed requirements) · [ARCHITECTURE.md](ARCHITECTURE.md) · [CHANGELOG.md](CHANGELOG.md) |

This document answers *what* SKILLORA is, *who* it is for, *what is in and out of scope*, and *how success is measured*. Detailed functional and non-functional requirements live in the [SRS](SRS.md); design lives in [ARCHITECTURE.md](ARCHITECTURE.md) and the [ADRs](adr/README.md).

---

## 1. Problem

Career and upskilling guidance for students and early-career professionals is generic. Asked "how do I become a Data Analyst?", platforms and counsellors return the same flat list of skills to everyone, ignoring what the person already knows, how skills depend on each other, and which order is fastest. This causes two concrete problems:

1. **Wasted effort.** Learners re-learn skills they already have, or learn skills in an order that ignores prerequisites (for example machine learning before statistics).
2. **No informed choice.** When several routes lead to the same role (Tableau or Power BI, TensorFlow or PyTorch), learners cannot compare them by time or by market demand.

Skills are not independent: they have prerequisite and co-requisite relationships, and some requirements can be met in more than one way. The distance between a person's current skills and a role's requirements is therefore a structured, navigable space, not a checklist.

## 2. Product vision

SKILLORA models skills and their relationships as a **knowledge graph** and uses **weighted shortest-path search (A\*)** to compute a personalised, prerequisite-respecting, minimum-effort learning path from a user's current skills to a chosen target role. It offers ranked alternatives, explains every step, and recomputes the plan as the user makes progress.

> SKILLORA recommends **what** to learn and in **which order**. It does not teach the content itself.

## 3. Users

| User class | Description | Primary needs |
|---|---|---|
| **Learner** (primary) | Student or early-career professional; no graph-theory knowledge assumed | Quick self-assessment, a clear ordered roadmap, the reason behind each step, visible progress |
| **Admin / curator** | Team member maintaining the skill and role dataset | Create/edit/delete skills, edges and roles safely; graph health feedback (cycles, orphans) |
| **Evaluator** | Faculty reviewer / examiner | Evidence that the recommendations are correct and better than generic advice (the D6 report), a working demo |

## 4. Goals and objectives

| ID | Objective | Measured by |
|---|---|---|
| **O1** | Model 80–120 curated skills as a knowledge graph: per-skill learning effort (`estHours`) and market demand (`marketDemand`), typed edges (`prerequisite_of` mandatory or one-of-several via `group`, `corequisite_with` informational) | D1 acceptance criteria |
| **O2** | Capture a user's skill profile (beginner / intermediate / advanced) and target role with low friction | Onboarding completable in under 2 minutes |
| **O3** | Compute a minimum-effort, prerequisite-respecting learning path with A\* over the state space of "skills held so far" (Dijkstra as the zero-heuristic baseline), containing only skills the user does not already hold | 0 order violations; optimal cost |
| **O4** | Offer 2–3 genuinely different near-optimal routes, ranked by `α·(cost / maxCost) + β·(1 − marketDemandAvg)`, default `α = 0.7, β = 0.3` | Alternatives returned where the role has OR-choices |
| **O5** | Present the path as a visual roadmap and the graph as an explorable force-directed diagram; marking a skill complete recomputes and re-ranks the remaining path | Recompute < 2 s; history preserved |
| **O6** | Validate recommendations on ≥ 5 scenarios against a naive generic-roadmap baseline and a hand-reasoned expert path, with quantified deltas | D6 report |

### Non-goals

SKILLORA is not a learning platform, a job board, or an assessment tool. It does not host courses, verify skills, or match users to vacancies.

## 5. Scope

### 5.1 In scope (v1)

| Area | Capability | Pages |
|---|---|---|
| Accounts | Register, log in, log out (server-side session revocation), delete account | P2, P9 |
| Skill profile | Search skills (typeahead), declare proficiency, edit and remove skills | P3, P9 |
| Target role | Browse the role catalog, view requirements (including "any one of" choices), see a has/needs comparison, pick exactly one active role | P4, P9 |
| Path computation | Primary path plus up to 2 ranked alternatives, cost and rationale per step, "already qualified" case | P5, P7 |
| Visualisation | Ordered roadmap; force-directed skill graph (full or path-scoped) with node detail | P5, P6 |
| Progress | Mark skills complete, automatic recomputation, path history | P8 |
| Curation (admin) | CRUD for skills, edges and roles with cycle and cascade protection; graph health metrics | P10 |
| Public landing | Product explainer with live skill/role counts | P1 |
| Evaluation | Offline benchmark scenarios and report (not a UI feature) | — |
| Documentation | Architecture, data model, API docs (OpenAPI for both services), user guide | — |
| Hosting | The web app deployed and reachable by URL (D2 acceptance) | — |

### 5.2 Out of scope (v1)

| Excluded | Reason / v1 behaviour |
|---|---|
| Course content, course links or embedded learning material | SKILLORA recommends *what* to learn, not *how* |
| Password reset / forgot password, email verification | Not needed for the demo scope; a user who forgets a password re-registers or asks an admin |
| Refresh tokens, social / OAuth login, multi-factor authentication | A single JWT with a server-side session is sufficient for v1 ([ADR-0004](adr/0004-jwt-with-server-side-sessions.md)) |
| Skill assessment or verification | Proficiency is self-reported and trusted |
| Live job-market scraping | `marketDemand` and `demandScore` are curated estimates ([D1 methodology](D1_Dataset_Methodology.md)) |
| Salary data, job-opening counts, time logging | Not part of the data model |
| More than one active target role per user | One role at a time keeps paths and progress unambiguous |
| Admin user management UI | Admins are promoted by setting `role: "admin"` in the database |
| Native mobile apps | Responsive web only, legible from 768 px width |
| Notifications, social or team features, localisation | Not required by the objectives |

### 5.3 Future work (post-v1)

Measured demand from sampled job postings; dataset `data/v2`; caching of computed paths; a diversity constraint so alternatives differ meaningfully; pedagogical step ordering; a user study with several advisors. See [D6 §12](D6_Evaluation_Report.md#12-scaling-and-future-work).

## 6. User journeys and acceptance criteria

| # | Journey | Acceptance criteria |
|---|---|---|
| J1 | **Get started** — a visitor registers and logs in | Registration rejects duplicate emails; login returns a session token; a logged-out token is rejected |
| J2 | **Describe myself** — the learner adds the skills they know | Typeahead matches word prefixes (`pyt` → Python); proficiency is one of three levels; profile saved |
| J3 | **Choose a goal** — the learner picks a target role | Requirements show names and "any one of" groups; has/needs comparison reflects the profile |
| J4 | **See my roadmap** — the dashboard shows the plan | Ordered steps with hours and a "why this skill" rationale; skills already held are not repeated; total time shown |
| J5 | **Compare routes** — the learner compares alternatives and picks one | Up to 3 routes with hours, demand and score; picking a route does not recompute; a single-route case is stated clearly |
| J6 | **Make progress** — the learner marks a skill complete | The remaining path is recomputed within 2 s; the previous path is kept in history; completing the same skill twice is rejected |
| J7 | **Understand why** — the learner explores the skill graph | Full or path-scoped graph; edge type and OR-group visible; clicking a node shows its details |
| J8 | **Curate the data** (admin) | Cycle-creating or duplicate edges are rejected; deleting a skill still required by a role is blocked; learners' paths refresh after edits |

## 7. Deliverables

| ID | Deliverable | Fulfils | Acceptance criteria | Status (2026-10-15) |
|---|---|---|---|---|
| **D1** | Curated skill-graph dataset | O1 | 80–120 skills, ≥ 150 prerequisite edges, every skill has `estHours` and `marketDemand`, acyclic prerequisite graph, every role has an OR-choice, documented methodology, versioned JSON + seed script | ✅ Done — 114 skills, 183 prerequisite + 22 corequisite edges, 18 roles |
| **D2** | Full-stack MERN web app | O2, O5 | Auth, profile, role browser, dashboard; deployed and reachable by URL | 🟡 Backend done; frontend in progress; deployment pending |
| **D3** | Python path-computation microservice | O3, O4 | A\* state-space search with admissible, consistent heuristic and Dijkstra mode; `validate_order()`; ≥ 80% test coverage on fixture graphs; runnable on its own with `curl` | ✅ Done — 58 tests, 97.5 % coverage |
| **D4** | Roadmap and graph explorer UI | O5 | Ordered roadmap with rationales; force-directed graph with hover info and node detail | 🟡 In progress (Member C) |
| **D5** | Progress tracking with recomputation | O5 | Completion triggers recompute < 2 s; old paths archived | 🟡 Backend done; UI in progress |
| **D6** | Evaluation report | O6 | ≥ 5 scenarios, metrics table, limitations and scaling | ✅ Done — 6 scenarios ([report](D6_Evaluation_Report.md)) |
| **D7** | Project documentation | All | Architecture diagram, data model, OpenAPI for both services, user guide with screenshots | 🟡 Docs done; user guide needs the finished UI |

## 8. Success metrics

| Metric | Target | Current |
|---|---|---|
| Path computation time (primary + alternatives) | < 2 s for ≤ 120 skills | Slowest role 622 ms in-process; worst evaluated scenario ≈ 0.3 s |
| Prerequisite-order violations in returned paths | 0 | 0 in every scenario |
| Time saved versus the generic roadmap | Positive in every scenario | 4.35 % – 47.83 % (mean 24.56 %) |
| Agreement with hand-authored expert path | Expert set among the returned routes | Among the top 3 in all 6 scenarios |
| Roles offering at least two routes | All roles | 18 / 18 |
| Onboarding time (O2) | < 2 minutes | To be measured once the UI is complete |
| Python test coverage (D3) | ≥ 80 % | 97.5 % (`pytest --cov=.`) |

## 9. Assumptions and constraints

- Users report their proficiency honestly; one level of error changes a skill's cost by half its hours.
- `estHours`, `marketDemand` and `demandScore` are expert estimates calibrated against fixed anchors; they support relative comparison, not quoted statistics.
- The graph is limited to 80–120 skills in v1 for curation quality and search performance.
- Stack: MongoDB, Express, React, Node.js, plus one Python/FastAPI service for the graph algorithm ([ADR-0001](adr/0001-separate-python-path-service.md)).

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| A Python service in a MERN-focused lab may be questioned | Grading | Justified in [ADR-0001](adr/0001-separate-python-path-service.md); confirm acceptability with faculty |
| Search is exponential in the worst case | Slow requests | Relevance pruning, a 1.5× near-optimal bound, a 200 000-state cap with fallback ([ALGORITHM.md](ALGORITHM.md)) |
| Free hosting tiers sleep idle services (30–60 s wake-up) | First request after idle fails with 503 | Longer `PYTHON_TIMEOUT_MS` in production, or wake the service via `/health` |
| Shared development database with credentials circulated among the team, network access open to all IPs | Data exposure | Rotate the database password before submission; least-privilege database user; secrets never committed |
| Expert-estimated data | Credibility of numbers | Methodology and limitations documented in D1 and D6 |
