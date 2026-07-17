# Changelog

## [Unreleased]

### Added

- GitHub Actions: fast gate on push/PR; publish on `v*` tags via PyPI Trusted
  Publishing (per-package GitHub environments) and npm Trusted Publishing
  (OIDC).
- Root `distlift.toml` for lockstep releases (single tag updates all
  publishable Python and `@roborean/*` packages).
- MIT `LICENSE` and registry metadata on publishable packages.
- [`playground/Developers.md`](playground/Developers.md) for PyPI/npm/GitHub
  setup.
- Root project documentation (`README.md`, `AGENTS.md`) describing the
  Roborean architecture and contributor conventions.
- Canonical Phase 1 JSON Schemas, project-format documentation, and shared
  Python/TypeScript conformance fixtures for projects, rules, and patches.
- Python `roborean-spec` and `roborean-engine` Phase 1 packages, including
  schema validation, deterministic compilation, workspace patches, built-in
  bits, rules, and a diagnostics CLI.
- TypeScript workspace configuration and Phase 1 `@roborean/spec` and
  `@roborean/engine` packages for schema validation, rules, patches, compile,
  and dry-run execution.
- Phase 2 durable runs: `RunRequest` / `RunRecord` / `RunDiff` schemas,
  storage ports, JSON/YAML and SQLAlchemy adapters, idempotent `RunService`,
  effect-class retry policy, plugin entry-point discovery, and CLI
  `store` / `runs` commands.
- Phase 3 document stack: driver protocols, text/markdown/xlsx/docx/image/dxf
  drivers, template manifests, document bits, artifact records, TypeScript
  preview packages, and CLI `render` / `preview` / `drivers list`.

### Added

- Phase 4 platform: `roborean-api-fastapi`, `apps/api`, `@roborean/api-types`,
  `@roborean/validation`, `@roborean/ui`, `@roborean/editor`, and `apps/web`
  with OpenAPI export, local dry-run, and Playwright smoke tests.
- Root `e2e-ai.yml` and `make e2e` (`e2e-ai verify`) for full-stack Playwright
  gates with local API + Vite `webServer`.

### Changed

- Playwright E2E uses ports `15173` / `18080` so dev `make api` / `make web` can
  stay on `8000` / `5173`.
- `RunService` persists document artifact bytes and honors project package
  directories for compile/run.

### Fixed

- Root `pyproject.toml` is marked as a non-package uv workspace so
  `pip install -e .` no longer fails trying to build `roborean-workspace`
  with Hatchling.
