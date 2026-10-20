# SKILLORA Documentation

Start here. Each document has one job; together they replace the former single specification (see [the mapping below](#where-the-old-specification-went)).

## Documents

| Document | Answers | Audience |
|---|---|---|
| [PRD.md](PRD.md) | What are we building, for whom, **what is in and out of scope**, how is success measured, deliverable status | Everyone, evaluators first |
| [SRS.md](SRS.md) | The numbered functional (FR) and non-functional (NFR) requirements and their traceability | Developers, evaluators |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system is structured: containers, flows, security, reliability, deployment (D7 architecture diagram) | Developers, evaluators |
| [adr/](adr/README.md) | Why each significant design decision was made | Developers, evaluators |
| [DATA_MODEL.md](DATA_MODEL.md) | MongoDB collections DB-1 … DB-7, fields, indexes, lifecycle rules | Developers |
| [API.md](API.md) | Every endpoint (API-N-\*, API-P-\*), conventions, error codes, behaviour clients must handle, page → endpoint map | Frontend and backend developers |
| [ALGORITHM.md](ALGORITHM.md) | The path-computation algorithm exactly as implemented, with a worked example | Developers, evaluators |
| [HOW_IT_WORKS.md](HOW_IT_WORKS.md) | Plain-language walkthrough of the whole system | New readers, viva preparation |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploying for free: Vercel (client), Render (API, path service), Atlas; env vars, cold starts, troubleshooting | Developers, operators |
| [DEV_SETUP.md](DEV_SETUP.md) | Running the three services locally, tests, troubleshooting | Developers |
| [USER_GUIDE.md](USER_GUIDE.md) | How to use the app as a learner or admin, with screenshots (deliverable D7 user guide) | End users, evaluators |
| [CHANGELOG.md](CHANGELOG.md) | Specification and design history, v1.0 → v4.1 | Everyone |
| [TEAM_WORK_DIVISION.md](TEAM_WORK_DIVISION.md) | Who owns what (original work plan) | Team |
| [D1_Dataset_Methodology.md](D1_Dataset_Methodology.md) | Deliverable D1: how the skill graph was curated | Evaluators |
| [D6_Evaluation_Report.md](D6_Evaluation_Report.md) · [evaluation/](evaluation/) | Deliverable D6: benchmark results and analysis | Evaluators |

Also: [CONTRIBUTING.md](../CONTRIBUTING.md) (workflow and conventions), [`data/README.md`](../data/README.md) (dataset file formats), and the README in each service folder.

**Suggested reading order.** Evaluator: PRD → ARCHITECTURE → ALGORITHM → D6. Frontend developer: API → DATA_MODEL → DEV_SETUP. New team member: HOW_IT_WORKS → PRD → ARCHITECTURE.

## Identifiers

IDs are stable across all documents and code comments:

| Prefix | Meaning | Defined in |
|---|---|---|
| O1–O6 | Objectives | [PRD §4](PRD.md#4-goals-and-objectives) |
| D1–D7 | Deliverables | [PRD §7](PRD.md#7-deliverables) |
| P1–P10 | Pages | [API §4](API.md#4-page--endpoint-map) |
| API-N-\* / API-P-\* | Node API / path-service endpoints | [API.md](API.md) |
| DB-1–DB-7 | Collections | [DATA_MODEL.md](DATA_MODEL.md) |
| FR-\* / NFR-\* | Requirements | [SRS.md](SRS.md) |
| ADR-NNNN | Decisions | [adr/](adr/README.md) |

## Keeping the docs current

- A change to behaviour updates the affected document **in the same pull request** (API change → `API.md` and `skillora-api/docs/openapi.js`; schema change → `DATA_MODEL.md`; algorithm change → `ALGORITHM.md`).
- A significant design decision gets a new ADR; superseded ADRs are marked, not deleted.
- Specification-level changes get a [CHANGELOG](CHANGELOG.md) entry.
- Each document's header shows its status and, where relevant, the last-updated date.

## Where the old specification went

`SKILLORA_Project_Specification.md` (v4.0) and `SkillGap_Navigator_Problem_Objectives_Deliverables.md` were split into the documents above in v4.1. IDs did not change.

| Former section | Now in |
|---|---|
| Problem statement, objectives, deliverables (Parts 1–2 and the problem/objectives document) | [PRD.md](PRD.md) |
| Part 3 — Database schema | [DATA_MODEL.md](DATA_MODEL.md) |
| Part 4 — Pages and API mapping, path-service API | [API.md](API.md) |
| Part 4.3 — Path-computation algorithm | [ALGORITHM.md](ALGORITHM.md) |
| Part 5 — SRS (5.1 → §1, 5.2 → §2, 5.3 → §3, 5.4 → §4, 5.5 → §5) | [SRS.md](SRS.md) |
| Summary traceability table | [SRS §6](SRS.md#6-traceability) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |
| `SKILLORA_Internal_Working_Guide.md` | [HOW_IT_WORKS.md](HOW_IT_WORKS.md) |
| `SKILLORA_Dev_Setup.md` | [DEV_SETUP.md](DEV_SETUP.md) |
| `SKILLORA_Team_Work_Division.md` | [TEAM_WORK_DIVISION.md](TEAM_WORK_DIVISION.md) |
