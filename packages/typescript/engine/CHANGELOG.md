# Changelog

## [Unreleased]

### Added

- TypeScript Phase 1 compiler, rule runtime, immutable workspace patches, and
  built-in workspace bits.
- Read-only helpers to load persisted `run-results` / `run-record` JSON
  artifacts for diagnostics.
- Phase 3 compile path accepts document definitions (preview packages render
  client-side; binary drivers remain Python-only).

### Changed

- Package and `ENGINE_VERSION` bumped to `0.3.0`.

### Fixed

- Replace `node:crypto` with browser-safe SHA-256 / UUID helpers so Vite
  client bundles no longer crash on `createHash`.
- Stop re-exporting Node-only `runArtifacts` helpers from the package
  root entry (they pulled `node:fs` into browser graphs).
