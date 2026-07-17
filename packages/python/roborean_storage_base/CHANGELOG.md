# Changelog

## [Unreleased]

### Added

- `ProjectRepository`, `RunRepository`, and `ArtifactStore` ports with
  shared storage error types for durable Phase 2 persistence.

### Changed

- Align storage port protocol method docstrings with repository Python
  style guidelines.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
