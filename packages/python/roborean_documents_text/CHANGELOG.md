# Changelog

## [Unreleased]

### Added

- `roborean.text` driver with `{{slot}}` replacement and plain text ops.

### Changed

- Align text driver docstrings, typed attributes, and block comments
  with repository Python style guidelines.

### Fixed


- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
- Normalize template newlines to LF so rendered text is portable on Windows.
