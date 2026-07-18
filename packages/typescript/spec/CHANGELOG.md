# Changelog

## [Unreleased]

### Added

- Document definition schema fields: required `title`, optional
  `description`, and optional `baseTemplateRef`.
- `validateDataAgainstSchema` for validating data against inline JSON Schema
  documents.
- Schema-backed TypeScript project models, validation, and migration support.
- Zod schemas for Phase 2 `RunRequest` and `RunDiff` artifact shapes.
- Phase 3 document / template models and project `schemaVersion` `1.1.0`.

### Changed

- Package version bumped to `0.3.0`.
- `migrateProject` defaults to project schema `1.1.0` (matches Python
  `migrate_project`).
- Regenerated embedded schemas after `variable.schema.json` allows null
  `description`.

### Fixed

- Validate against embedded canonical schemas (no `node:fs`), so browser
  bundles can import `@roborean/spec` without Vite externalizing filesystem
  APIs.
