# Changelog

## [Unreleased]

### Added

- FastAPI application factory with project CRUD, compile, durable runs,
  artifact download, and document preview endpoints.
- Client redaction for workspace secrets and run results.
- Optional auth stub via `X-Roborean-Principal`.

### Changed

- Align core API module docstrings, typed attributes, and block
  comments with repository Python style guidelines.
- Align API service module docstrings, type hints, and block comments
  with repository Python style guidelines.
- Align API schema DTO class attribute docstrings with repository
  Python style guidelines.
- Align API router endpoint docstrings, type hints, and block comments
  with repository Python style guidelines.
- Align OpenAPI customization helper docstring and block comments with
  repository Python style guidelines.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
- Omit null optional fields when redacting projects for clients so
  browser compile/validate matches JSON Schema string optionals.
