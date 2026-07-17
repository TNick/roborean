# Changelog

## [Unreleased]

### Added

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

### Changed

### Fixed

- Root `pyproject.toml` is marked as a non-package uv workspace so
  `pip install -e .` no longer fails trying to build `roborean-workspace`
  with Hatchling.
