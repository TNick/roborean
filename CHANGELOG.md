# Changelog

## [Unreleased]

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
[unreleased]: https://github.com/TNick/roborean/compare/v0.1.2...HEAD
