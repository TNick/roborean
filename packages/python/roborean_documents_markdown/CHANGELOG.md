# Changelog

## [Unreleased]

### Added

- `roborean.markdown` driver emitting CommonMark from flow operations.

### Changed

- Align Markdown driver docstrings, typed attributes, and block comments
  with repository Python style guidelines.

### Fixed


- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
- Normalize template newlines to LF for portable CommonMark output.
