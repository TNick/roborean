# Changelog

## [Unreleased]

### Added

- Deterministic Phase 1 project compilation, rule evaluation, workspace
  patches, built-in bits, and diagnostics CLI.
- Store-backed `RunService` with idempotency keys, run diffs, secret
  resolver ports, effect-class retry policy, and CLI `store` / `runs`
  commands.
- Document session integration, document bit types, compiler document
  checks, and CLI `render` / `preview` / `drivers list`.

### Changed

- Durable runs persist document artifact bytes and use project package
  directories when compiling document-enabled projects.
- Align core engine module docstrings, typed attributes, and block
  comments with repository Python style guidelines.
- Align secrets and rules submodule docstrings, typed attributes, and
  block comments with repository Python style guidelines.
- Align built-in bits submodule docstrings, typed attributes, and block
  comments with repository Python style guidelines.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
