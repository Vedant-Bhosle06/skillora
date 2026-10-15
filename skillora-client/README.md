# skillora-client

React + TypeScript frontend for SKILLORA, built with Vite and Tailwind CSS. It talks to the Node API (`skillora-api`), which in turn calls the Python path service.

## Setup

Requires Node.js 20+ and the API running on `http://localhost:5000` (the path service on `5001` is needed for path computation and admin graph metrics).

```bash
cd skillora-client
npm install
```

Create `skillora-client/.env` (git-ignored, never committed):

```
VITE_API_BASE_URL=http://localhost:5000
```

Every `VITE_` variable is bundled into the public JavaScript, so never put secrets in this file. `VITE_API_BASE_URL` is the only setting the client reads. Production builds fail if it is missing, and the app warns in the console if a production build points at a non-`https` API.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on http://localhost:5173 (localhost only; matches the API's CORS origin) |
| `npm run build` | Type-check, then build to `dist/` with the Content-Security-Policy injected |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm test` | Run the Vitest unit tests in `src/**/*.test.ts` |

## Build and preview

The API only allows CORS from `http://localhost:5173`, so stop `npm run dev` first, then:

```bash
npm run build
npx vite preview --port 5173 --strictPort
```

Open http://localhost:5173 and check the browser console: there should be no Content-Security-Policy violations.

## Folder structure

```
index.html            app shell
vite.config.ts        Vite config (React, Tailwind, `@` -> src alias, port 5173, build-only CSP plugin)
vitest.config.ts      unit test config
src/
  main.tsx            entry point (self-hosted fonts are imported here)
  App.tsx             providers and routes
  index.css           Tailwind and theme styles
  vite-env.d.ts       typed import.meta.env
  api/                client.ts (axios + ApiError), types.ts, one file per API area, queries.ts (React Query hooks)
  auth/               tokenStore.ts, AuthContext.tsx, guards.tsx (RequireAuth / RequireTargetRole / RequireAdmin)
  context/            ThemeContext.tsx, ToastContext.tsx
  hooks/              useDebouncedValue.ts, useEnsureFreshPath.ts
  lib/                pure logic with *.test.ts (requirements, path status/metrics, graph layout, redirects, slugs, formatting)
  components/         Navbar, ui.tsx primitives, ErrorBoundary, SkillDetailPanel, TradeoffChart
  pages/              Landing, Auth, OnboardingSkills, OnboardingRole, Dashboard, Alternatives,
                      Progress, GraphExplorer, Settings, Admin
  pages/admin/        SkillForm, EdgeForm, RoleForm
```

Pages read and write data only through the hooks in `src/api/queries.ts`; `AuthContext` is the one place that calls the auth API directly.

## Security notes

- **Token storage.** The JWT lives in `localStorage` under `skillora.token`, accessed only through `src/auth/tokenStore.ts`. Logout revokes the session on the server; any 401 clears the token and the React Query cache, and sign-out in one tab signs out the others.
- **XSS.** All server text is rendered as React text. `dangerouslySetInnerHTML`, `innerHTML`, `eval` and `new Function` are not used.
- **Content-Security-Policy.** `npm run build` injects a `<meta http-equiv="Content-Security-Policy">` tag: scripts, styles, fonts and images from the app's own origin only, network calls only to the app and the API origin, no plugins (`object-src 'none'`), and locked `base-uri` / `form-action`. The dev server has no CSP because Vite's hot reload needs inline scripts.
- **No third-party requests.** Fonts (Inter, DM Sans, JetBrains Mono) are self-hosted through `@fontsource` packages; there are no analytics or CDN scripts.
- **Errors.** `ApiError` keeps only the status and the server's message, never the axios config or headers, so tokens never reach logs or the UI.
- **Redirects.** Post-login redirects go through the `safeRedirect` allowlist (no open redirects).
- **Admin.** The admin UI is shown based on the role from `/users/me`; the server enforces admin rights (403) on every admin route.
- **Dev server.** Vite listens on localhost only (no `--host`).

Audit commands (all should print nothing, except the second, which lists only `tokenStore.ts` and `ThemeContext.tsx`):

```bash
grep -rn "dangerouslySetInnerHTML\|innerHTML\|eval(\|new Function" src
grep -rln "localStorage\|sessionStorage" src
grep -rn "console\.\(log\|debug\)" src
npm audit --omit=dev
```
