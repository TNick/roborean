# Changelog

## [Unreleased]

### Added

- Bit-recipe schema (`recipe.schema.json`) and `Recipe` Pydantic model for
  portable project fragments imported from the templates library.
- Required `name` on bit type manifests for user-facing bit type labels.
- Document definition fields: required `title`, optional `description`, and
  optional `baseTemplateRef` for copy-on-write template forks.
- Schema-backed Pydantic models and project migration support for Roborean
  projects.
- Durable-run models: `RunRequest`, `RunRecord`, `RunDiff`, and related
  enums for Phase 2 persistence.
- Document models for Phase 3: extended `DocumentDefinition`,
  `TemplateManifest`, `DocumentOperation`, `ArtifactRecord`, and project
  format `1.1.0`.

### Changed

- Project migration to `1.1.0` backfills missing document `title` values
  from each document `id`.
- Export `Redacted` workspace value from the public package API.
- Align schema models, schema loader, and migration helper docstrings
  with repository Python style guidelines.
- Allow null `description` on variables in `variable.schema.json` to
  match compiled output and Pydantic models.

### Fixed
