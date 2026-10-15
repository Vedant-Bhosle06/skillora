# skillora-api

Node.js / Express backend — all `/api/*` endpoints.

**Owner:** Member B

Endpoint reference and client behaviour: [`../docs/API.md`](../docs/API.md). Collections: [`../docs/DATA_MODEL.md`](../docs/DATA_MODEL.md). Design: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Setup

```bash
npm install
cp ../.env.example .env   # keep ONLY the [NODE API] section in this file
npm run dev               # starts on http://localhost:5000
```

Environment variables (see `../.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string (same as the Python service) |
| `JWT_SECRET` | yes | Long random string |
| `INTERNAL_API_KEY` | yes | Shared secret with the Python service |
| `PORT` | no | Default `5000` |
| `JWT_EXPIRES_IN` | no | Default `7d` |
| `PYTHON_SERVICE_URL` | no | Default `http://localhost:5001` |
| `PYTHON_TIMEOUT_MS` | no | Default `5000` |
| `CLIENT_ORIGIN` | no | CORS origin, default `http://localhost:5173` |
| `NODE_ENV` | no | `production` enables `trust proxy` (needed behind Render/Railway) |

The server exits at startup if `JWT_SECRET`, `MONGO_URI` or `INTERNAL_API_KEY` is missing.

## API docs

Interactive Swagger UI: `http://localhost:5000/api/docs` (raw spec: `/api/docs.json`).
The spec is hand-written in `docs/openapi.js`.

## Dependencies on other services

Path routes (`/api/paths/compute`, `/api/users/me/skills/complete`, admin graph writes and `/api/admin/graph/metrics`) call the Python path service, so it must be running with the same `INTERNAL_API_KEY`. Path computation also needs the seeded skills, edges and roles in MongoDB. If the Python service is down, compute returns `503` and completing a skill returns `202 { recomputePending: true }`.
