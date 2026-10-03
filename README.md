# SKILLORA — Skill-Gap Navigator

> A personalized upskilling-path recommendation system that models skills as a knowledge graph and computes optimized learning sequences via A\* search.

---

## What It Does

SKILLORA takes a user's current skills and a target job role, then computes the minimum-effort, prerequisite-respecting learning path using A\* search over a curated skill knowledge graph. Users can compare alternative routes, mark skills complete, and watch their roadmap update in real time.

---

## Project Structure

```
skillora/
├── data/v1/               ← Curated skill graph dataset (JSON seed files)
│   ├── skills.json
│   ├── edges.json
│   └── roles.json
├── scripts/
│   ├── seed.js            ← Populates MongoDB from data/v1/*.json
│   └── seed-eval.js       ← Generates D6 evaluation scenarios
├── skillora-api/          ← Node.js / Express backend (all /api/* endpoints)
├── skillora-path-service/ ← Python / FastAPI algorithm microservice (/compute/*, /graph/*)
├── skillora-client/       ← React frontend (Vite)
├── docs/                  ← Project specification, work division, dev guide
├── .env.example           ← Environment variable template
└── .gitignore
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, react-force-graph |
| Backend API | Node.js 18+, Express, Mongoose |
| Algorithm Service | Python 3.11+, FastAPI, NetworkX, heapq |
| Database | MongoDB Atlas |
| Auth | JWT + server-side sessions (bcrypt) |

---

## Local Development

See **[docs/SKILLORA_Dev_Setup.md](docs/SKILLORA_Dev_Setup.md)** for full setup instructions.

**Quick start (after `.env` files are configured):**

```bash
# Terminal 1 — Node API (port 5000)
cd skillora-api && npm run dev

# Terminal 2 — Python service (port 5001)
cd skillora-path-service && uvicorn main:app --port 5001 --reload

# Terminal 3 — React client (port 5173)
cd skillora-client && npm run dev
```

---

## Documentation

| File | Description |
|---|---|
| [`docs/SKILLORA_Project_Specification.md`](docs/SKILLORA_Project_Specification.md) | Full technical spec v4.0 — objectives, DB schema, all API endpoints, SRS |
| [`docs/SKILLORA_Internal_Working_Guide.md`](docs/SKILLORA_Internal_Working_Guide.md) | How the A\* algorithm works, data flow, worked example |
| [`docs/SkillGap_Navigator_Problem_Objectives_Deliverables.md`](docs/SkillGap_Navigator_Problem_Objectives_Deliverables.md) | Problem statement, objectives, deliverables |
| [`docs/SKILLORA_Team_Work_Division.md`](docs/SKILLORA_Team_Work_Division.md) | Team work breakdown — who builds what, commit plan |
| [`docs/SKILLORA_Dev_Setup.md`](docs/SKILLORA_Dev_Setup.md) | Ports, run commands, env setup, Git workflow |
| [`.env.example`](.env.example) | Environment variable template for all three services |

---

## Team

| Member | Role |
|---|---|
| Member A | Data Curator + Python Algorithm Engineer (D1, D3, D6) |
| Member B | Node.js Backend Engineer (D2 backend, D7 API docs) |
| Member C | React Frontend Integrator (D2 frontend, D4, D5, D7 user guide) |
