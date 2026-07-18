# Changelog

## [Unreleased]

### Added

- `roborean.image` Pillow-backed raster driver with draw_text ops.
- Vendored conformance font under `conformance/fixtures/fonts/` and
  deterministic PNG byte compare for document fixture D05.

### Changed

- Align image driver docstrings, typed attributes, and block comments
  with repository Python style guidelines.
- Raster text uses vendored TrueType fonts from `conformance/fixtures/fonts/`
  for deterministic PNG output in conformance tests.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
