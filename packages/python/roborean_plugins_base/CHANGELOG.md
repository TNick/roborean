# Changelog

## [Unreleased]

### Added

- Plugin manifest model and `importlib.metadata` entry-point discovery for
  installed bit types (`roborean.bit_types`).

### Changed

- Align plugin manifest and entry-point discovery docstrings with
  repository Python style guidelines.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
