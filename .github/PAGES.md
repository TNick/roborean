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

## Google Cloud OAuth client

Authorize these JavaScript origins on the OAuth client:

- `https://tnick.github.io`
- `http://localhost:5173` (local Google-mode development)

Do not put a client secret in the static bundle or repository variables.
