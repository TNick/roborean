# Changelog

## [Unreleased]

### Fixed

- Reject `GOCSPX-…` values for `VITE_GOOGLE_API_KEY` (OAuth client secrets
  are not Picker developer keys) and warn in the folder gate.

## [0.1.7] - 2026-07-18

### Changed

- another fix for google login

### Fixed

- Google Workspace folder gate no longer stacks a MUI modal backdrop under the connect panel after account chooser; create/pick/connect share one OAuth session so actions stay usable after sign-in.
- Folder-gate Picker hint clarifies that `VITE_GOOGLE_API_KEY` is a Google Cloud API key, not the OAuth client id.

## [0.1.6] - 2026-07-18

### Changed

- Hatch was packaging library/ twice

## [0.1.5] - 2026-07-18

### Changed

- Fix google drive access

## [0.1.4] - 2026-07-18

### Added

- Browser-first Google Workspace mode (`@roborean/google-workspace`): Drive folder binding, Sheets-backed project/run storage, Google Docs outputs, and static GitHub Pages deploy via `static.yml` on version tags. Folder gate can create a Drive folder without Picker; optional `VITE_GOOGLE_API_KEY` enables Google Picker.
- Bit type manifests require a human-facing `name` used in the editor and templates library recipe catalog.
- Global templates library: API catalog, `/templates` web page, and reusable `@roborean/ui` browser with document import, recipe import, and project starter creation flows.
- Bit-recipe schema for portable workspace/document/bit fragments.
- Document definitions require a human-facing `title`; optional `description` and `baseTemplateRef` support copy-on-write template forks in the editor and API.
- Project template file CRUD in the HTTP API with dict and SQLAlchemy storage backends.
- Web UI can create blank projects, delete projects, and edit project name and description (backed by existing API CRUD).
- CI semantic gate (`make verify`): core/runtime/document conformance, TypeScript document preview parity, storage integration, OpenAPI drift check, dry-run parity, and schema sync; GitHub Actions split across `tests.yml`, `openapi.yml`, and `platform.yml`.
- Project package lockfile schema and compile-time enforcement; runtime idempotency/retry/persistence conformance harness; document D99 capability fixture; editor panels for workspace, documents, dependencies, preview, and bit reordering.
- Phase 4 editor forms (rules, bits, variables), run history panel, and richer run detail downloads; `schemas/preview.schema.json` for the HTTP preview response.
- TypeScript engine golden tests for all `conformance/runs/*` compile and run-results fixtures (dual-runtime parity with Python).
- TypeScript document preview conformance for D01–D06 (`make conformance-documents-ts`), driven by `expected.preview-fixtures.json` goldens written by the Python document harness.
- Vendored conformance font and PNG byte goldens for document fixture D05.

### Changed

- Document conformance compares packages to `conformance/expected/documents/` goldens (artifacts + previews + compile errors), with `python tools/run_document_conformance.py --write` to refresh.
- Default local API port is `8765` (`make api` / `roborean-api` / web `VITE_API_BASE_URL` fallback) to avoid clashing with Docker stacks on `8000`.
- Project page shows title and Edit on the same toolbar as Dry-run / Run on server; metadata and delete live in the Edit dialog.
- Web app uses a shared top toolbar on every page with theme preferences (white/black, spacing, font size) and a stub user menu.
- Document the code
- UI adjustments. GitHub pages
- Use action for pages
- Integrate with static pages
- CI failed because D05 compared raw PNG bytes

### Fixed

- `tools/run_conformance.py` invokes pnpm without `shell=True` so Linux CI actually runs `@roborean/engine` tests instead of bare `pnpm` help.
- Document conformance compares raster artifacts by decoded pixels (not PNG bytes) so zlib/libpng differences between Windows and Linux CI do not fail D05.
- drop shell=True, resolve pnpm via shutil.which, and pass the full argv list. Local tools/run_conformance.py now reports Conformance passed.

## [0.1.3] - 2026-07-17

## [0.1.2] - 2026-07-17

### Added

- `pre-commit` in `make init-d` (git hooks installed automatically). Black and isort rewrite Python on commit; Prettier rewrites TypeScript/JS. `make delint` / `make pre-commit` run formatters on the full tree.

### Changed

- Pin Prettier to `3.9.5` in both root `package.json` and the pre-commit hook so `make lint` / CI and `make pre-commit` apply the same formatting.
- `make pre-commit` runs hooks twice so autofix rewrites do not leave the target failing after the first pass.
- GitHub Actions use Node 24-based majors (`actions/checkout@v5`, `actions/setup-node@v6`, `actions/setup-python@v6`, `pnpm/action-setup@v6`).
- Fix CI tests
- No matching distribution found
- Another CI error
- Added a Build TypeScript packages step before Playwright in platform-e2e.
- 3/3 Playwright tests pass locally
- more CI errors fixed. Now using pre-commit
- One more linting error

### Fixed

- Stop tracking TypeScript `tsconfig.tsbuildinfo` files so CI `tsc -b` rebuilds `dist/` instead of skipping emit when outputs are missing.
- Align inter-package Python dependency pins with lockstep `0.1.1` so editable CI installs no longer require unpublished `>=0.2`/`>=0.3`/ `>=0.4` releases from PyPI.
- Add `.flake8` (`max-line-length = 80`) so Flake8 matches Black; format and clean unused imports that were failing `make lint`.
- CI platform E2E runs Playwright once with a shared `webServer` instead of `e2e-ai verify`'s per-test restarts.
- Platform E2E builds `@roborean/*` packages before Playwright so Vite and Node can resolve `exports` entry points under `dist/`.
- `@roborean/engine` no longer imports `node:crypto`, so the web app can load dry-run / compile helpers in the browser.
- `@roborean/spec` embeds canonical JSON Schemas instead of reading them with `node:fs`, fixing blank Vite pages in platform E2E.
- API project redaction omits null optional fields so client dry-run validation no longer fails with `must be string` on `description` / `label`.
- Vite web app dedupes React / MUI and allows monorepo `fs` access for workspace package source aliases.

## [0.1.1] - 2026-07-17

### Added

- GitHub Actions: fast gate on push/PR; publish on `v*` tags via PyPI Trusted Publishing (per-package GitHub environments) and npm Trusted Publishing (OIDC).
- Root `distlift.toml` for lockstep releases (single tag updates all publishable Python and `@roborean/*` packages).
- MIT `LICENSE` and registry metadata on publishable packages.
- [`playground/Developers.md`](playground/Developers.md) for PyPI/npm/GitHub setup.
- Root project documentation (`README.md`, `AGENTS.md`) describing the Roborean architecture and contributor conventions.
- Canonical Phase 1 JSON Schemas, project-format documentation, and shared Python/TypeScript conformance fixtures for projects, rules, and patches.
- Python `roborean-spec` and `roborean-engine` Phase 1 packages, including schema validation, deterministic compilation, workspace patches, built-in bits, rules, and a diagnostics CLI.
- TypeScript workspace configuration and Phase 1 `@roborean/spec` and `@roborean/engine` packages for schema validation, rules, patches, compile, and dry-run execution.
- Phase 2 durable runs: `RunRequest` / `RunRecord` / `RunDiff` schemas, storage ports, JSON/YAML and SQLAlchemy adapters, idempotent `RunService`, effect-class retry policy, plugin entry-point discovery, and CLI `store` / `runs` commands.
- Phase 3 document stack: driver protocols, text/markdown/xlsx/docx/image/dxf drivers, template manifests, document bits, artifact records, TypeScript preview packages, and CLI `render` / `preview` / `drivers list`.
- Phase 4 platform: `roborean-api-fastapi`, `apps/api`, `@roborean/api-types`, `@roborean/validation`, `@roborean/ui`, `@roborean/editor`, and `apps/web` with OpenAPI export, local dry-run, and Playwright smoke tests.
- Root `e2e-ai.yml` and `make e2e` (`e2e-ai verify`) for full-stack Playwright gates with local API + Vite `webServer`.

### Changed

- Playwright E2E uses ports `15173` / `18080` so dev `make api` / `make web` can stay on `8000` / `5173`.
- `RunService` persists document artifact bytes and honors project package directories for compile/run.
- Phase 1
- Phase 2 and phase 3
- Phase 4

### Fixed

- Root `pyproject.toml` is marked as a non-package uv workspace so `pip install -e .` no longer fails trying to build `roborean-workspace` with Hatchling.

[0.1.1]: https://github.com/TNick/roborean/compare/846ef574a1c267a96143a80cb33ffe8e935d737c...v0.1.1
[0.1.2]: https://github.com/TNick/roborean/compare/v0.1.1...v0.1.2
[0.1.3]: https://github.com/TNick/roborean/compare/v0.1.2...v0.1.3
[0.1.4]: https://github.com/TNick/roborean/compare/v0.1.3...v0.1.4
[0.1.5]: https://github.com/TNick/roborean/compare/v0.1.4...v0.1.5
[0.1.6]: https://github.com/TNick/roborean/compare/v0.1.5...v0.1.6
[0.1.7]: https://github.com/TNick/roborean/compare/v0.1.6...v0.1.7
[unreleased]: https://github.com/TNick/roborean/compare/v0.1.7...HEAD
