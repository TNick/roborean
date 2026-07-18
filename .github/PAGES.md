# GitHub Pages deployment

Tagged releases (`v*`) publish a static browser-only Roborean build to the
`gh-pages` branch from `.github/workflows/publish.yml`.

## Repository settings

1. Set repository variable `VITE_GOOGLE_CLIENT_ID` to the public OAuth client
   id used by the static app.
2. In GitHub Pages settings, choose **Deploy from a branch**, branch
   `gh-pages`, folder `/ (root)`.
3. Protect `gh-pages` so only the release workflow updates it.

## Google Cloud OAuth client

Authorize these JavaScript origins on the OAuth client:

- `https://tnick.github.io`
- `http://localhost:5173` (local Google-mode development)

Do not put a client secret in the static bundle or repository variables.
