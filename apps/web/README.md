# Roborean web

Vite + React shell for `@roborean/editor`.

```bash
pnpm --filter web dev
```

Set `VITE_API_BASE_URL` (default `http://localhost:8000`). Playwright E2E uses
`15173` / `18080` via `webServer` so dev servers on `5173` / `8000` can stay up.

## E2E

From the repo root (after `make init-d`):

```bash
e2e-ai doctor
make e2e
```

Playwright starts the API and Vite via `webServer`
(`apps/web/e2e/scripts/start-platform.mjs`). Optional AI repair loop:
`e2e-ai repair`.

Use **Projects → Open set-and-copy example** to load
`/examples/02_set_and_copy.json`.
