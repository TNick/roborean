# Changelog

## [Unreleased]

### Added

- `roborean.xlsx` driver with sheet operations and HTML preview.
- `replace_named_value` scans all sheets for Mustache-like placeholders
  in non-formula string cells, skipping merged non-anchor cells.
- Minimal `set_metadata` support via workbook properties.
- Package unit tests for named-value substitution.

### Changed

- Align XLSX driver docstrings, typed attributes, and block comments
  with repository Python style guidelines.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
