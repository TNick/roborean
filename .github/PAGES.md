# GitHub Pages deployment

Tagged releases (`v*`) and manual workflow runs deploy the static browser-only
Roborean app via [`.github/workflows/static.yml`](workflows/static.yml) using
the official GitHub Pages actions (`upload-pages-artifact` /
`deploy-pages`).

## Repository settings

1. Set repository variable `VITE_GOOGLE_CLIENT_ID` to the public OAuth client
   id used by the static app.
2. In GitHub Pages settings, choose **GitHub Actions** as the source (not a
   branch deploy from `gh-pages`).
3. The deploy job uses the `github-pages` environment created by GitHub.
4. Allow tag deploys on that environment (required for `v*` releases):
   **Settings → Environments → github-pages → Deployment branches and
   tags**. Either choose **All branches and tags**, or **Selected** and
   add a tag rule for `v*` (or `v*.*.*`). If only `master` is allowed,
   tag pushes fail with “not allowed to deploy … environment protection
   rules”.
5. Clear any required reviewers / wait timer unless you want manual
   approval on every Pages deploy.
6. Optional but required for **Choose folder with Google Picker** and
   **Link existing Google Doc**: set repository variable
   `VITE_GOOGLE_API_KEY` to a browser **API key** (Google Cloud → APIs &
   Services → Credentials → Create credentials → API key). Typical keys
   start with `AIza`. Enable the **Google Picker API** and **Google Drive
   API** on the **same** Cloud project as the OAuth client. Without the
   key, users can still **Create a new folder** or paste a folder id.

   Do **not** use an OAuth client secret (`GOCSPX-…`) or the OAuth
   client id here. Secrets must never go in repository variables or the
   static bundle; Picker will return HTTP 401 if `developerKey` is a
   secret.

   Picker also needs the Cloud **project number** as `setAppId`. The app
   derives it from `VITE_GOOGLE_CLIENT_ID` (`{projectNumber}-….apps…`).
   Override with repository variable `VITE_GOOGLE_APP_ID` only if needed.

## Google Cloud API key (Picker)

The Pages build serves the app at `https://tnick.github.io/roborean/`
(`VITE_PAGES_BASE=/roborean/` in `apps/web/scripts/build-pages.mjs`).
Picker sends the browser page as the HTTP referrer, including that path.

On the API key used for `VITE_GOOGLE_API_KEY`:

1. **Same project** as the OAuth client and `appId` (project number).
   A key from another project causes “The API developer key is invalid”.
2. **Application restriction**: HTTP referrers (websites), not IP addresses.
3. **Referrer allowlist** — include both patterns (replace owner/repo if
   you fork):

   ```text
   https://tnick.github.io/*
   https://tnick.github.io/roborean/*
   http://localhost:5173/*
   ```

   The `/roborean/*` entry matters because the live site is not at the
   domain root; a key restricted only to `https://tnick.github.io/*` can
   still fail Picker with 401 on some referrer checks.
4. **API restriction**: unrestricted for a quick test, or restrict to
   Google Picker API (and Google Drive API if offered).
5. After changes, wait a few minutes, redeploy Pages, and hard-refresh.

OAuth **JavaScript origins** stay host-only (no path): `https://tnick.github.io`
and `http://localhost:5173` — see below.

## Google Cloud OAuth client

Authorize these **JavaScript origins** on the OAuth client (host only, no
path — unlike the API key referrer list above):

- `https://tnick.github.io`
- `http://localhost:5173` (local development; Drive is optional when the
  API is also available — use `VITE_STORAGE_MODE=google` only for
  Google-only / Pages-like local testing)

Do not put a client secret in the static bundle or repository variables.
