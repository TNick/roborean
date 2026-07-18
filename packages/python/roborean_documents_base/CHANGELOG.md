# Changelog

## [Unreleased]

### Added

- Static template library assets (D01–D06 document templates, starters, and
  recipes) with `template_library` loader helpers.
- Document driver protocols, template store, capability checks, and
  session manager for Phase 3 document generation.

### Changed

- Align package module docstrings, typed attributes, and block comments
  with repository Python style guidelines.
- Set and copy starter fills three preview documents (title, copy, and
  workspace summary) from workspace variables so dry-run preview shows
  rendered output for each document.
- Template library starters and recipes label every bit so the editor
  shows readable titles instead of `(no label)`.

### Fixed

- Wheel build no longer duplicates `library/` assets (removed redundant
  Hatch `force-include` that conflicted with package inclusion).
- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
