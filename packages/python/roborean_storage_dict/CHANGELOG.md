# Changelog

## [Unreleased]

### Added

- Filesystem project package loader/saver with JSON and YAML (`safe_load`)
  support, plus durable run artifact directories and idempotency indexes.

### Changed

- Align dict storage module docstrings, typed attributes, and block
  comments with repository Python style guidelines.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
