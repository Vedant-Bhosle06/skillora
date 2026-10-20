# Deployment

How to run SKILLORA for free on the internet: the React client on **Vercel Hobby**, the Node API and the Python path service on **Render Free**, and the data on **MongoDB Atlas M0**. No paid services and no credit card are needed for the services below.

Environment variable **values are never stored in the repository**. They are typed into the hosting dashboards. This document lists names only.

## 1. Architecture

```
Browser ──► Vercel (static React app)
   │
   └──────► Render: skillora-api  (Node/Express, /api/*)
                │  X-Internal-Key
                └──► Render: skillora-path  (FastAPI, /compute/paths, /health)

skillora-api and skillora-path both read MongoDB Atlas M0
```

| Piece | Host | Config file |
|---|---|---|
| Client | Vercel | `skillora-client/vercel.json` |
| API | Render web service `skillora-api` | `render.yaml` |
| Path service | Render web service `skillora-path` | `render.yaml` |
| Database | MongoDB Atlas M0 | none (already set up) |

The browser talks only to the API. The API calls the path service over its public HTTPS URL, authenticated with the shared `INTERNAL_API_KEY`.

## 2. Step-by-step setup

Do the steps in this order. The Render services need the Vercel URL for `CLIENT_ORIGIN`, and the Vercel build needs the API URL, so there is one round trip (steps 2 to 4).

### Step 0: prepare secrets and Atlas

1. **Rotate the Atlas database password** for production (Atlas, Database Access, edit the user) and use the new connection string in Render. Do not reuse the one in your local `.env` files.
2. **Generate new secrets** for production, one per variable (see [section 4](#4-generating-secrets)): `JWT_SECRET` and `INTERNAL_API_KEY`.
3. **Atlas, Network Access:** add `0.0.0.0/0` (allow access from anywhere). Render free services have no static outbound IP addresses, so an IP allow-list is not possible. The database is still protected by the password; keep it strong.
4. Make sure `MONGO_URI` names the database (`...mongodb.net/<dbname>?...`). Both services use the database named in the URI.

### Step 1: Render (API and path service)

1. Push the branch to GitHub (Render deploys from a repository).
2. In Render choose **New, Blueprint**, connect the repository and pick the branch that contains `render.yaml`.
3. Render shows the two services (`skillora-api`, `skillora-path`, both on the Free plan) and asks for every variable marked `sync: false`. Fill them in (names are in [section 3](#3-environment-variables)):
   - `skillora-api`: `MONGO_URI`, `JWT_SECRET`, `INTERNAL_API_KEY`, `CLIENT_ORIGIN`, `PYTHON_SERVICE_URL`
   - `skillora-path`: `MONGO_URI`, `INTERNAL_API_KEY` (the same value as on the API)
4. For `CLIENT_ORIGIN` enter `http://localhost:5173` for now; you will change it in step 3.
5. For `PYTHON_SERVICE_URL` enter the public URL of the path service, `https://skillora-path.onrender.com` (the name in `render.yaml` decides the subdomain; if Render adds a suffix because the name is taken, use the URL shown on the `skillora-path` page).
6. Apply. Wait for both services to be **Live**. Check:
   - `https://skillora-api.onrender.com/api/stats/public` returns the skill and role counts.
   - `https://skillora-api.onrender.com/api/docs` shows Swagger.
   - `https://skillora-path.onrender.com/health` returns `"graphLoaded": true`.

> **Why `PYTHON_SERVICE_URL` is typed in, not wired automatically.** Render can inject a service's private `host:port` with `fromService`/`hostport`, but that has no scheme and relies on private networking between sleeping free services. A plain public URL is the simplest reliable option. (The API also accepts a value with no scheme and adds `http://`, so the private form would work if you ever switch.)

### Step 2: Vercel (client)

1. In Vercel choose **Add New, Project** and import the repository.
2. **Root Directory:** `skillora-client`.
3. **Framework Preset:** Vite (build command `npm run build`, output `dist`; the defaults are right).
4. **Environment Variables:** `VITE_API_BASE_URL` = `https://skillora-api.onrender.com` (the API origin, no trailing path). This is required: the production build fails without it, because it also builds the page's Content-Security-Policy from this value.
5. Deploy. Vercel gives you a URL such as `https://<your-app>.vercel.app`.

### Step 3: set CLIENT_ORIGIN on Render

Open the `skillora-api` service, Environment, and set `CLIENT_ORIGIN` to the Vercel URL. To keep local development working as well, give a comma-separated list:

```
https://<your-app>.vercel.app,http://localhost:5173
```

Use the exact origin: scheme and host, no path. A trailing slash is ignored. Save; Render redeploys the API.

### Step 4: check the live site

Register, pick skills and a role, and confirm a path appears. The first request after a quiet period is slow (see [section 5](#5-cold-starts-and-limits)).

## 3. Environment variables

### skillora-client (Vercel)

| Name | Used for |
|---|---|
| `VITE_API_BASE_URL` | Origin of the Node API. Read at **build time**: used for all API calls and for the CSP `connect-src`. Changing it needs a redeploy. |

### skillora-api (Render)

| Name | Required | Used for |
|---|---|---|
| `MONGO_URI` | yes (secret) | Atlas connection string, including the database name. |
| `JWT_SECRET` | yes (secret) | Signs login tokens. |
| `INTERNAL_API_KEY` | yes (secret) | Sent to the path service as `X-Internal-Key`; must match the path service. |
| `CLIENT_ORIGIN` | yes | Allowed browser origin(s) for CORS. One origin or a comma-separated list. Defaults to `http://localhost:5173`. |
| `PYTHON_SERVICE_URL` | yes | Public URL of the path service. |
| `PYTHON_TIMEOUT_MS` | preset `60000` | Timeout for path-service calls and the budget for waking it. |
| `JWT_EXPIRES_IN` | preset `7d` | Token lifetime. |
| `NODE_ENV` | preset `production` | Enables proxy trust so rate limiting sees real client IPs. |
| `PORT` | set by Render | Port the API binds to. Do not set it yourself. (On a Mac locally, use `5050`.) |

### skillora-path (Render)

| Name | Required | Used for |
|---|---|---|
| `MONGO_URI` | yes (secret) | Atlas connection string (the database named in the URI). Needs `dnspython`, which `requirements.txt` installs, for `mongodb+srv://` URIs. |
| `INTERNAL_API_KEY` | yes (secret) | Shared secret that callers must send. Must equal the API's value. |
| `PYTHON_VERSION` | preset `3.12.8` | Python version used by Render. |
| `PORT` | set by Render | Port uvicorn binds to (in the start command). |
| `MONGO_DB` | optional | Database name, if it is not in the URI. |
| `SKILLS_COLLECTION`, `EDGES_COLLECTION` | optional | Collection names (defaults `skills`, `skill_edges`). |
| `MAX_STATES`, `COST_BOUND_RATIO` | optional | Search limits (defaults `200000`, `1.5`). |

## 4. Generating secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it once per secret. Use a **new** `JWT_SECRET` and a **new** `INTERNAL_API_KEY` for production, different from your local ones, and rotate the Atlas password too. Paste values only into the Render dashboard, never into files, issues or chat. Changing `JWT_SECRET` signs everyone out.

## 5. Cold starts and limits

- Render free services **sleep after 15 minutes without traffic** and need **about a minute to wake**. There are two services, so after a long quiet spell the API wakes first and the path service after it.
- Free web services get **750 instance-hours per month** (time spent asleep does not count). Keeping two services awake all month would take about 1,488 hours, so a **keep-alive pinger is deliberately not used**: it would exhaust the allowance and the services would be suspended for the rest of the month.
- To make the wait painless:
  - The landing, sign-in and register pages send one quiet request to `/api/stats/public`, which starts waking the API before you sign in.
  - When the API starts it pings the path service `/health` once.
  - Before computing a path the API calls the path service `/health` and retries with backoff for up to about 60 s (never longer than `PYTHON_TIMEOUT_MS`), then makes the real call. If the service never answers, the usual 503 handling applies.
  - The client waits up to 75 s for ordinary requests and 90 s for path computation, and after 4 s of waiting shows "Waking the planner — free hosting sleeps when idle. This can take up to a minute."
- Vercel Hobby is free for non-commercial use and has no cold start for the static client.

## 6. Redeploys

Render and Vercel both deploy automatically on every push to the connected branch (`main`). Changing an environment variable in a dashboard also redeploys that service. `VITE_API_BASE_URL` is baked into the client build, so after changing it trigger a Vercel redeploy. `render.yaml` changes are applied when you sync the Blueprint.

## 7. Optional: custom domain

The GitHub Student Pack includes a free `.me` domain for a year. In Vercel, Project, Settings, Domains, add the domain and create the DNS records Vercel shows. Then add the new origin to `CLIENT_ORIGIN` on Render (keep the `vercel.app` one if you want both to work), for example `https://skillora.me,https://<your-app>.vercel.app`.

## 8. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Browser console shows a CORS error | `CLIENT_ORIGIN` on the API does not contain the exact page origin (scheme and host, no path). Fix it on Render and wait for the redeploy. An old API instance may also still be waking. |
| "Refused to connect ... violates Content Security Policy directive connect-src" | The client was built with a different `VITE_API_BASE_URL` than the API it is calling. The CSP allows only `'self'` and the build-time API origin. Correct the variable on Vercel and redeploy. |
| Build fails with "VITE_API_BASE_URL must be set for production builds" | The variable is missing in the Vercel project settings. |
| Mixed-content or "token would travel in clear text" warning | `VITE_API_BASE_URL` uses `http://`. Use the `https://` URL. |
| Compute fails with 503 "Path computation service unavailable" | The path service is down, still waking, or the keys differ. Open its `/health` URL and wait until it answers. Confirm `PYTHON_SERVICE_URL` is the public URL, and that `INTERNAL_API_KEY` is identical on both services (a mismatch shows as 403 in the API log). |
| `/health` shows `"graphLoaded": false` | The path service could not read Atlas: check `MONGO_URI` (database name in the URI, password rotated, Network Access `0.0.0.0/0`) in its logs. |
| First load or first compute takes a minute | Normal cold start, see [section 5](#5-cold-starts-and-limits). Wait; the "Waking the planner" message appears. |
| API crashes at startup with "missing required env var" | One of `JWT_SECRET`, `MONGO_URI`, `INTERNAL_API_KEY` is not set on Render. |
| Page refresh on a deep link (for example `/dashboard`) gives 404 | `skillora-client/vercel.json` is not being used. Check that the Vercel root directory is `skillora-client`. |
| Rate limit hit by many users at once | Without `NODE_ENV=production` the limiter sees the proxy IP for everyone. Keep the preset. |

## 9. Live URLs

To be filled in after deployment.

| What | URL |
|---|---|
| App | `https://<your-app>.vercel.app` |
| API | `https://<your-api>.onrender.com` |
| API docs | `https://<your-api>.onrender.com/api/docs` |
| Path service | `https://<your-path-service>.onrender.com` |
| Path service docs | `https://<your-path-service>.onrender.com/docs` |
