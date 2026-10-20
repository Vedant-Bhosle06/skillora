# SKILLORA — Skill-Gap Navigator

> A personalised upskilling-path recommender that models skills as a knowledge graph and computes the minimum-effort, prerequisite-respecting learning path to a target role with A\* search.

## What it does

A user enters the skills they already have and picks a target job role. SKILLORA computes the cheapest ordered set of skills still to learn, explains why each step is there, offers ranked alternative routes (for example Tableau versus Power BI), and recomputes the plan as the user marks skills complete. Scope and goals: [docs/PRD.md](docs/PRD.md).

## Architecture at a glance

```
React SPA  ──/api/*──►  Node.js API (Express)  ──X-Internal-Key──►  Python path service (FastAPI + NetworkX)
                              │                                              │
                              └────────────── MongoDB Atlas ◄──── read-only ─┘
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository layout

```
skillora/
├── data/v1/                 curated skill graph (skills, edges, roles) — D1
├── scripts/                 seed.js (load dataset), seed-eval.js (D6 evaluation)
├── skillora-api/            Node.js / Express API — all /api/* endpoints
├── skillora-path-service/   Python / FastAPI path computation — /compute/*, /graph/*
├── skillora-client/         React frontend (Vite)
├── docs/                    product, design and report documents — start at docs/README.md
├── .env.example             environment template for every service
└── CONTRIBUTING.md          branches, commits, pull requests, secrets
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| API | Node.js 18+, Express 5, Mongoose 9 |
| Path computation | Python 3.11+, FastAPI, NetworkX, heapq |
| Database | MongoDB Atlas |
| Auth | JWT with server-side sessions, bcrypt |

## Quick start

Full instructions, including `.env` setup: [docs/DEV_SETUP.md](docs/DEV_SETUP.md).

```bash
# Terminal 1 — Node API (port 5000)
cd skillora-api && npm install && npm run dev

# Terminal 2 — path service (port 5001), inside its virtual environment
cd skillora-path-service && pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app --port 5001 --reload

# Terminal 3 — React client (port 5173)
cd skillora-client && npm install && npm run dev
```

API documentation while running: `http://localhost:5000/api/docs` (Node) and `http://localhost:5001/docs` (path service).

> **macOS:** the system uses port 5000 for AirPlay Receiver, so the API cannot bind to it. On a Mac set `PORT=5050` in `skillora-api/.env` and set `VITE_API_BASE_URL=http://localhost:5050` in `skillora-client/.env`.

## Documentation

| Document | Contents |
|---|---|
| [docs/README.md](docs/README.md) | Index and reading order |
| [docs/PRD.md](docs/PRD.md) | Problem, users, scope, success metrics, deliverable status |
| [docs/SRS.md](docs/SRS.md) | Functional and non-functional requirements |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, flows, security, deployment |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Free hosting on Vercel + Render + Atlas: setup, env vars, cold starts |
| [docs/adr/](docs/adr/README.md) | Architecture decision records |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | MongoDB collections |
| [docs/API.md](docs/API.md) | Endpoint reference and client behaviour |
| [docs/ALGORITHM.md](docs/ALGORITHM.md) | Path-computation algorithm |
| [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) | Plain-language walkthrough |
| [docs/D1_Dataset_Methodology.md](docs/D1_Dataset_Methodology.md) · [docs/D6_Evaluation_Report.md](docs/D6_Evaluation_Report.md) | Dataset and evaluation reports |

## Team

| Member | Role | Deliverables |
|---|---|---|
| Member A | Data curator and algorithm engineer | D1, D3, D6 |
| Member B | Backend engineer | D2 (backend), D7 (API and architecture docs) |
| Member C | Frontend engineer | D2 (frontend), D4, D5, D7 (user guide) |
