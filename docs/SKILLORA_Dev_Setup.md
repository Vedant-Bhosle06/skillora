# SKILLORA — Local Development Setup
### Ports, Commands & Running All Three Services

---

## Port Assignments

| Service | Technology | Port | URL |
|---|---|---|---|
| **skillora-api** | Node.js / Express | `5000` | `http://localhost:5000` |
| **skillora-path-service** | Python / FastAPI | `5001` | `http://localhost:5001` |
| **skillora-client** | React / Vite | `5173` | `http://localhost:5173` |
| **MongoDB** | Atlas (cloud) | — | connection string in `.env` |

> All three services must be running simultaneously for the app to work.
> Open three separate terminal windows — one per service.

---

## One-Time Setup (Do This First)

### 1. Clone the Repo

```bash
git clone https://github.com/<your-org>/skillora.git
cd skillora
```

### 2. Create `.env` Files for Each Service

Copy the relevant section from `.env.example` at the repo root:

```bash
# Node API
copy .env.example skillora-api\.env        # Windows
cp .env.example skillora-api/.env          # Mac/Linux

# Python service
copy .env.example skillora-path-service\.env
cp .env.example skillora-path-service/.env

# React client
copy .env.example skillora-client\.env
cp .env.example skillora-client/.env
```

Then open each `.env` and **fill in the real values** (get `MONGO_URI` and `INTERNAL_API_KEY` from your team lead):

| Variable | Who sets it | Notes |
|---|---|---|
| `MONGO_URI` | **Member who created Atlas cluster** | Same string in all three `.env` files |
| `JWT_SECRET` | Member B | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `INTERNAL_API_KEY` | Member A + B agree | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — put the SAME value in Node `.env` and Python `.env` |

### 3. Install Dependencies

```bash
# Node API
cd skillora-api
npm install

# React Client
cd ../skillora-client
npm install

# Python service
cd ../skillora-path-service
pip install -r requirements.txt
```

### 4. Seed the Database (Member A runs this after writing the seed script)

```bash
cd skillora-api
node scripts/seed.js
```

> This populates `skills`, `skill_edges`, and `roles` collections.
> Run it only once (it is idempotent — safe to re-run if needed).

---

## Running the Services

Open **3 separate terminal windows**:

### Terminal 1 — Node.js API

```bash
cd skillora-api
npm run dev
```

Expected output:
```
Server running on http://localhost:5000
Connected to MongoDB Atlas
```

Verify it works:
```bash
curl http://localhost:5000/api/stats/public
```

---

### Terminal 2 — Python FastAPI Service

```bash
cd skillora-path-service
uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:5001
INFO:     Graph loaded: 102 nodes, 163 edges
```

Verify it works (no key required on /health):
```bash
curl http://localhost:5001/health
# Expected: { "status": "ok" }
```

Test a real computation (replace ObjectIds with real ones from your DB):
```bash
curl -X POST http://localhost:5001/compute/paths \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: <your_INTERNAL_API_KEY>" \
  -d "{\"heldSkills\": [], \"requirements\": [{\"anyOf\": [\"<skillId>\"], \"minRank\": 2}], \"k\": 3}"
```

---

### Terminal 3 — React Client

```bash
cd skillora-client
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in 300ms
➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in your browser.

---

## Running Tests

### Python unit tests (Member A)

```bash
cd skillora-path-service
pytest tests/ -v --cov=. --cov-report=term-missing
```

> Must pass with ≥80% coverage (D3 acceptance criterion).
> Tests use in-memory fixture graphs — MongoDB does NOT need to be running.

---

## Evaluation Seed Script (Member A — run after app is working end-to-end)

```bash
cd skillora-api
node scripts/seed-eval.js
```

> Calls the Python service directly for ≥5 scenarios, computes metrics, writes to `evaluation_scenarios` (DB-6).
> Run once before generating the D6 report.

---

## API Quick Reference

### Node API base: `http://localhost:5000`

| Auth required | Header |
|---|---|
| Yes (most routes) | `Authorization: Bearer <JWT token>` |
| Admin only | same header; user must have `role: "admin"` in DB |

### Python service base: `http://localhost:5001`

| Endpoint | Auth |
|---|---|
| `GET /health` | None |
| All others | `X-Internal-Key: <INTERNAL_API_KEY>` |

> The browser NEVER calls the Python service directly.
> Only the Node API calls it internally.

---

## Git Workflow

```bash
# Before starting any feature — pull latest
git pull origin main

# Create a feature branch
git checkout -b feat/member-a/seed-script

# Commit often with descriptive messages
git add .
git commit -m "feat(data): add skills.json – Data/ML track (40 nodes)"

# Push and open a Pull Request
git push origin feat/member-a/seed-script
```

**Branch naming convention:** `feat/<member-a|member-b|member-c>/<short-description>`

**Commit message convention:** `feat|fix|test|docs(scope): short description`

Examples from the work division:
- `feat(python): add search.py – A* state-space search with heapq`
- `feat(auth): POST /api/auth/login – verify, issue JWT, write session`
- `feat(p6): P6 Graph – click node → skill detail panel`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `MongooseError: buffering timed out` | Check `MONGO_URI` is correct; your IP is on Atlas allowlist |
| `403` from Python service | `INTERNAL_API_KEY` in Node `.env` doesn't match Python `.env` |
| React: `Network Error` on API call | Node API isn't running, or `VITE_API_BASE_URL` is wrong |
| Python: `ModuleNotFoundError: networkx` | Run `pip install -r requirements.txt` again |
| Port already in use | Another process is using 5000/5001/5173 — kill it or change the port in `.env` |
| Graph not updated after admin edit | Check that Node is calling `POST /graph/reload` after admin writes; check Python logs |
