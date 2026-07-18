# Roborean web

Vite + React shell for `@roborean/editor`.

```bash
pnpm --filter web dev
```

## Storage modes

| Mode | When | Persistence |
|------|------|-------------|
| `api` (default) | Local / unset, or `VITE_STORAGE_MODE=api` | FastAPI at `VITE_API_BASE_URL`; Google Drive optional when `VITE_GOOGLE_CLIENT_ID` is set |
| `google` | `VITE_STORAGE_MODE=google` or Pages build | User-selected Drive folder + Sheets + Docs (required; no API) |

Locally, set a Google OAuth client id without `VITE_STORAGE_MODE=google` to
use both backends: the Drive folder gate is optional, and the projects list
merges API and Drive entries. Pages builds keep Google-only.

```bash
cp apps/web/.env.example apps/web/.env.local
# edit VITE_GOOGLE_CLIENT_ID (keep STORAGE_MODE unset for dual local mode)
pnpm --filter web dev
```

Never set a Google client secret in the web app. Authorize the GitHub Pages
origin (`https://tnick.github.io`) and local Vite origin in the Google Cloud
OAuth client.

## Static / GitHub Pages build

```bash
VITE_GOOGLE_CLIENT_ID=... pnpm run build:pages
```

This emits a self-contained bundle under `apps/web/dist` with base path
`/roborean/` and hash routing. Tagged releases (and manual workflow runs)
deploy that bundle via `.github/workflows/static.yml` using GitHub Pages
Actions.

Configure the GitHub repository Pages source to **GitHub Actions**.

## E2E

From the repo root (after `make init-d`):

```bash
e2e-ai doctor
make e2e
```

Playwright starts the API and Vite via `webServer`
(`apps/web/e2e/scripts/start-platform.mjs`). Optional AI repair loop:
`e2e-ai repair`.

Use **Projects → New project** to create a blank project. Edit name
and description on the project page, then **Save**. Delete from the list
or the project page.

Browse **Templates library** from the home page (`/templates`) to use project
starters, import document templates, or import bit recipes into an existing
project (API mode only).
