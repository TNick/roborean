# Conformance fixtures

This directory is the language-neutral golden corpus for the Roborean Python
and TypeScript runtimes. Both implementations must read the same fixtures and
produce equivalent normalized results.

- `projects/` contains valid projects and intentional semantic failures.
- `rules/` contains workspace snapshots, Rule ASTs, and expected results.
- `patches/` contains immutable workspace patch application vectors.
- `runs/` contains compile/run goldens (`input.project.json`,
  `expected.compiled.json`, `expected.run-results.json`).
- `documents/` contains document package inputs (project + templates).
- `expected/documents/` contains document goldens for each package
  (see below).

Project fixtures `05_invalid_undeclared_write.json` and
`06_const_rejection.json` intentionally exercise error paths. Rule fixtures
may contain `expected` or `expectedError`.

Runners must ignore volatile output fields such as run IDs, timestamps, compile
timestamps, and durations when comparing run artifacts.

## Document goldens

Layout mirrors run fixtures: inputs under `documents/<id>/`, expectations
under `expected/documents/<id>/`.

```text
expected/documents/<id>/
  expected.artifacts.json      # documentId, path, mediaType, compare
  artifacts/<outputTarget>     # golden bytes (when compare != skip)
  expected.previews.json       # preview map without generatedAt
  expected.compile-error.json  # D99-style negative compile fixtures only
```

`compare` is one of `bytes`, `semantic` (xlsx/docx), or `skip` (DXF embeds
timestamps/GUIDs). PNG uses `bytes` with fonts under `fixtures/fonts/`.
Refresh with:

```bash
python tools/run_document_conformance.py --write
python tools/run_document_conformance.py
```
