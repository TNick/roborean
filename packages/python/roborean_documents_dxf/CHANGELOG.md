# Changelog

## [Unreleased]

### Added

- `roborean.dxf` driver with drawing ops and drawing-json preview.

### Changed

- Align DXF driver docstrings, typed attributes, and block comments
  with repository Python style guidelines.

### Fixed


- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
- Normalize CR/LF in template DXF text so ezdxf preserves R2010+ versions
  on Windows checkouts.
