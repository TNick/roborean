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
6. Optional but required for **Choose folder with Google Picker**: set
   repository variable `VITE_GOOGLE_API_KEY` to a browser **API key**
   (Google Cloud → APIs & Services → Credentials → Create credentials →
   API key). Typical keys start with `AIza`. Restrict to HTTP referrers
   `https://tnick.github.io/*` and `http://localhost:5173/*`, and enable
   the Google Picker API + Drive API. Without it users can still
   **Create a new folder** or paste a folder id.

   Do **not** use an OAuth client secret (`GOCSPX-…`) or the OAuth
   client id here. Secrets must never go in repository variables or the
   static bundle; Picker will return HTTP 401 if `developerKey` is a
   secret.

   Picker also needs the Cloud **project number** as `setAppId`. The app
   derives it from `VITE_GOOGLE_CLIENT_ID` (`{projectNumber}-….apps…`).
   Override with repository variable `VITE_GOOGLE_APP_ID` only if needed.

## Google Cloud OAuth client

Authorize these JavaScript origins on the OAuth client:

- `https://tnick.github.io`
- `http://localhost:5173` (local development; Drive is optional when the
  API is also available — use `VITE_STORAGE_MODE=google` only for
  Google-only / Pages-like local testing)

Do not put a client secret in the static bundle or repository variables.
