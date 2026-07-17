# Changelog

## [Unreleased]

### Added

- Schema-backed Pydantic models and project migration support for Roborean
  projects.
- Durable-run models: `RunRequest`, `RunRecord`, `RunDiff`, and related
  enums for Phase 2 persistence.
- Document models for Phase 3: extended `DocumentDefinition`,
  `TemplateManifest`, `DocumentOperation`, `ArtifactRecord`, and project
  format `1.1.0`.

### Changed

- Export `Redacted` workspace value from the public package API.
- Align schema models, schema loader, and migration helper docstrings
  with repository Python style guidelines.

### Fixed
