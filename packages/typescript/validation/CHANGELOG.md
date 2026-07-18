# Changelog

## [Unreleased]

### Added

- Browser-side project diagnostics, dependency graph, local dry-run, and
  secret scrubbing helpers.

### Changed

- Local dry-run runs `browserSafe` document bits (such as
  `roborean.replace_named_value` on text templates) instead of skipping all
  document effect classes.
- `scrubProjectForEditor` backfills missing document titles from document
  ids when loading projects into the editor.

### Fixed
