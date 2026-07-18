# Changelog

## [Unreleased]

### Added

- `roborean.dxf` driver with drawing ops and drawing-json preview.
- `replace_named_value` support for TEXT, MTEXT, and block ATTRIB
  placeholders in loaded DXF templates.
- Extended `replace_named_value` to ATTDEF, MULTILEADER, DIMENSION
  override text, and ACAD_TABLE cell strings (in-place AcDbTable tag
  rewrite; proxy graphics may lag until a CAD app regenerates the
  table).

### Changed

- Align DXF driver docstrings, typed attributes, and block comments
  with repository Python style guidelines.

### Fixed


- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
- Normalize CR/LF in template DXF text so ezdxf preserves R2010+ versions
  on Windows checkouts.
