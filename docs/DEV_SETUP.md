# SKILLORA — Development Setup

How to run the three services locally. Architecture background: [ARCHITECTURE.md](ARCHITECTURE.md). Contribution rules: [CONTRIBUTING.md](../CONTRIBUTING.md).

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18 or newer |
| Python | 3.11 or newer |
| Git | any recent version |
| MongoDB | Atlas cluster (shared team database `skillora_dev`) — no local install needed |

Ask a teammate privately for `MONGO_URI` and `INTERNAL_API_KEY`. Never paste them into commits, issues or public chats.

## Ports

| Service | Folder | Port |
|---|---|---|
| Node API | `skillora-api/` | 5000 |
| Path service | `skillora-path-service/` | 5001 |
| React client | `skillora-client/` | 5173 |

All three must run at the same time for the full application.

## 1. Clone

```bash
git clone https://github.com/Vedant-Bhosle06/skillora.git
cd skillora
```

## 2. Environment files

[`.env.example`](../.env.example) has one section per service. Copy **only that service's section** into its `.env` file:

| File | Section | Values to fill in |
|---|---|---|
| `skillora-api/.env` | `[NODE API]` | `MONGO_URI`, `INTERNAL_API_KEY` (shared), `JWT_SECRET` (generate your own) |
| `skillora-path-service/.env` | `[PYTHON SERVICE]` | `MONGO_URI`, `INTERNAL_API_KEY` (same values as the API) |
| `skillora-client/.env` | `[REACT CLIENT]` | `VITE_API_BASE_URL=http://localhost:5000` |

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

The Node API exits at startup if `JWT_SECRET`, `MONGO_URI` or `INTERNAL_API_KEY` is missing; the path service refuses to start without `INTERNAL_API_KEY`.

## 3. Install dependencies

```bash
# Node API
cd skillora-api
npm install

# Path service (virtual environment)
cd ../skillora-path-service
python -m venv .venv
# Windows:      .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt

# React client
cd ../skillora-client
npm install
```

## 4. Database

The shared database is already seeded (114 skills, 205 edges, 18 roles). Re-seed only when `data/v1/*.json` changes:

```bash
# from the repo root, after npm install in skillora-api
node scripts/seed.js             # validate + idempotent upsert
node scripts/seed.js --dry-run   # validate the dataset only, no database connection
```

`seed.js` validates the dataset (required fields, acyclic prerequisites, an OR-choice per role), upserts it, marks active paths stale and asks a running path service to reload its graph.

## 5. Run

```bash
# Terminal 1 — Node API
cd skillora-api
npm run dev
```

Expected: `Server running on http://localhost:5000` and `Connected to MongoDB Atlas`. Check: `curl http://localhost:5000/api/stats/public` → `{"skillCount":114,"roleCount":18}`.

```bash
# Terminal 2 — path service (virtual environment activated)
cd skillora-path-service
uvicorn main:app --host 127.0.0.1 --port 5001 --reload
```

Check: `curl http://localhost:5001/health` → `{"status":"ok","graphLoaded":true,"nodes":114,"edges":183}` (183 prerequisite edges; corequisites are not part of the search graph).

```bash
# Terminal 3 — React client
cd skillora-client
npm run dev
```

Open `http://localhost:5173`.

**API documentation while running:** Node API at `http://localhost:5000/api/docs`, path service at `http://localhost:5001/docs`.

## 6. Tests and checks

```bash
# Path service unit and API tests (no database needed)
cd skillora-path-service
pytest --cov=. --cov-report=term-missing   # fails below 80 % coverage; plain `pytest` skips coverage

# Dataset QA and stress check (no database needed)
python -m tools.check_dataset --data ../data/v1
```

```bash
# D6 evaluation (needs the database and a running path service; from the repo root)
node scripts/seed-eval.js
```

`seed-eval.js` rewrites `docs/evaluation/results.json` and `metrics-table.md`. Commit those files only when the evaluation itself changes, not after a routine re-run.

## 7. Admin access

There is no endpoint to promote a user. In Atlas, open the `users` collection and set `role: "admin"` on your account; it takes effect on the next request (no re-login needed).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `MongooseServerSelectionError` / buffering timed out | Wrong `MONGO_URI`, or your IP is not allowed in Atlas → Network Access |
| Path service takes 10+ seconds to start | Slow DNS for the `mongodb+srv` lookup on some networks; it happens once at startup. Switching DNS (e.g. 1.1.1.1 / 8.8.8.8) helps |
| Compute returns `503` | Path service not running, wrong `PYTHON_SERVICE_URL`, or `INTERNAL_API_KEY` differs between the two `.env` files (check the API log for the real cause) |
| `403` from the path service | `INTERNAL_API_KEY` mismatch |
| Browser CORS error | The client is not on `http://localhost:5173`; set `CLIENT_ORIGIN` in `skillora-api/.env` |
| `429 Too many requests` on login | Rate limit (10 / minute / IP); wait a minute |
| Admin edit not reflected in paths | The path service was down during the edit; restart it or run `node scripts/seed.js` to trigger a reload |
| `ModuleNotFoundError` in Python | Virtual environment not activated, or dependencies not installed |
| Port already in use | Stop the other process, or change `PORT` / `--port` |
