# Changelog

## [Unreleased]

### Added

- Browser-first Google Workspace storage adapter: Drive folder binding,
  Sheets-backed project/run repositories, Docs document driver, and a
  client-compatible API for static / GitHub Pages deployments.
- Drive `copyFile` support and `gdrive:` template paths for native Google
  Docs template substitution via `replaceAllText` on copied templates.
- Project `templates/` sub-folder helpers and editor hooks for creating or
  linking Google Doc templates from the browser.
- Drive `exportText` for gdrive template bodies, `applyOpsToPlainText` for
  local substituted preview, and `googleDocsPreviewUrl` for read-only run
  iframes.

### Changed

- Google Docs runs copy linked `gdrive:` templates before applying document
  ops; blank-doc plain-text rendering remains the legacy fallback.
- `getTemplateContent` and `getGdriveTemplateText` export plain text from
  linked Google Doc templates for in-app preview.

### Fixed
