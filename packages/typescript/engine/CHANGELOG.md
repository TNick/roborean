# Changelog

## [Unreleased]

### Added

- TypeScript Phase 1 compiler, rule runtime, immutable workspace patches, and
  built-in workspace bits.
- Vitest golden tests for all `conformance/runs/*` compiled and run-results
  artifacts (parity with Python `run_conformance.py`).
- Read-only helpers to load persisted `run-results` / `run-record` JSON
  artifacts for diagnostics.
- Phase 3 compile path accepts document definitions (preview packages render
  client-side; binary drivers remain Python-only).

### Changed

- Package and `ENGINE_VERSION` bumped to `0.3.0`.
- Compiler alignment with Python for activation expressions, plugin version
  pins, unused-variable text, and project digest hashing.

### Fixed

- Register built-in document bit manifests in the browser compiler so projects
  using `roborean.replace_named_value` and related document bits compile
  without `E_UNKNOWN_BIT_TYPE`.
- Browser dry-run executes `browserSafe` text document bits and emits
  `replace_named_value` operations for local preview.
- Replace `node:crypto` with browser-safe SHA-256 / UUID helpers so Vite
  client bundles no longer crash on `createHash`.
- Stop re-exporting Node-only `runArtifacts` helpers from the package
  root entry (they pulled `node:fs` into browser graphs).
