# skillora-client

React + TypeScript frontend for SKILLORA, built with Vite and Tailwind CSS. It talks to the Node API (`skillora-api`), which in turn calls the Python path service.

## Setup

Requires Node.js 20+ and the API running on `http://localhost:5000`.

```bash
cd skillora-client
npm install
```

Create `skillora-client/.env` (never committed):

```
VITE_API_BASE_URL=http://localhost:5000
```

Every `VITE_` variable is bundled into the public JavaScript, so never put secrets in this file. `VITE_API_BASE_URL` is the only setting the client reads.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on http://localhost:5173 (localhost only; matches the API's CORS origin) |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm test` | Run the Vitest unit tests in `src/**/*.test.ts` |

## Folder structure

```
index.html          app shell
vite.config.ts      Vite config (React, Tailwind, `@` -> src alias, port 5173)
src/
  main.tsx          entry point
  App.tsx           routes
  index.css         Tailwind and theme styles
  vite-env.d.ts     typed import.meta.env
  api/              axios client, typed API calls, React Query hooks
  auth/             token storage, auth context, route guards
  context/          theme and toast providers
  hooks/            shared hooks
  lib/              pure logic (unit tested)
  components/       shared UI (Navbar, ui.tsx primitives)
  pages/            one file per screen
```
