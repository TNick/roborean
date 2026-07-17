# Changelog

## [Unreleased]

### Added

- SQLAlchemy ORM tables and repository adapters for projects and durable
  runs, mapping to Pydantic domain models.

### Changed

- Align SQLAlchemy storage module docstrings, typed attributes, and
  block comments with repository Python style guidelines.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
