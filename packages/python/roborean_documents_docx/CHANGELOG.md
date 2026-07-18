# Changelog

## [Unreleased]

### Added

- `roborean.docx` driver using docxtpl + python-docx with HTML preview.
- `replace_named_value` scans body paragraphs, table cells, and section
  headers/footers with run-preserving substitution.
- Minimal `set_metadata` support via ``core_properties``.
- Package unit tests for named-value substitution.

### Changed

- Align DOCX driver docstrings, typed attributes, and block comments
  with repository Python style guidelines.
- HTML preview and semantic compare include table and header/footer text.
- Skip docxtpl rendering when a template declares no ``requiredInputs``,
  so ``{{slot}}`` placeholders for ``replace_named_value`` survive until
  document ops run.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
