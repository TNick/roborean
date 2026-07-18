# Changelog

## [Unreleased]

### Added

- Dict project repository file helpers: `get_file`, `put_file`,
  `delete_file`, and `list_files` for template bytes under project packages.
- Dict package loader applies `migrate_project` before parsing projects.

### Fixed

- Exclusive idempotency index creation for dict run storage under concurrent
  writers, with index rollback when run artifact writes fail.
- Atomic JSON writes and an in-process lock for dict run storage so
  concurrent readers never observe truncated run-record or index documents.

### Added

- Filesystem project package loader/saver with JSON and YAML (`safe_load`)
  support, plus durable run artifact directories and idempotency indexes.

### Changed

- Align dict storage module docstrings, typed attributes, and block
  comments with repository Python style guidelines.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
