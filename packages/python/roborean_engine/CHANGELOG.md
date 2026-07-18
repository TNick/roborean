# Changelog

## [Unreleased]

### Added

- User-facing `name` on all bundled bit type manifests.
- Compile-time `project.lock` validation and document bit capability checks
  (`E_LOCKFILE_MISMATCH`, `E_CAPABILITY_MISSING`).
- Static document op scan: `bit_emitted_ops` emission specs, project config
  introspection, and registry audit (`E_BIT_EMISSION_UNDOCUMENTED`) at compile
  time for document-enabled projects.
- Runtime conformance harness for idempotency, retry, persistence round-trip,
  and migration fixture `07_migrated_from_1_0`.
- `tools/run_runtime_conformance.py`, `tools/compare_artifacts.py`, and
  `tools/gen_fixture_index.py`.

### Changed

- Dict package loading migrates projects through `migrate_project`.
- `RunService.create_and_execute` returns the existing run when a concurrent
  caller loses the dict idempotency claim instead of surfacing a spurious
  conflict.
- `append_text` bits that target flow documents validate
  `flow.insert_paragraph` when configured.

### Fixed

- Document conformance D04 compiles when `append_text` uses
  `flow.insert_paragraph` on the docx driver.

## [0.1.3] - 2026-07-17

### Added

- Deterministic Phase 1 project compilation, rule evaluation, workspace
  patches, built-in bits, and diagnostics CLI.
- Store-backed `RunService` with idempotency keys, run diffs, secret
  resolver ports, effect-class retry policy, and CLI `store` / `runs`
  commands.
- Document session integration, document bit types, compiler document
  checks, and CLI `render` / `preview` / `drivers list`.

### Changed

- Durable runs persist document artifact bytes and use project package
  directories when compiling document-enabled projects.
- Align core engine module docstrings, typed attributes, and block
  comments with repository Python style guidelines.
- Align secrets and rules submodule docstrings, typed attributes, and
  block comments with repository Python style guidelines.
- Align built-in bits submodule docstrings, typed attributes, and block
  comments with repository Python style guidelines.

### Fixed

- Lower inter-package dependency pins to `>=0.1.1` to match lockstep
  release versions.
