# Conformance fixtures

This directory is the language-neutral golden corpus for the Roborean Python
and TypeScript runtimes. Both implementations must read the same fixtures and
produce equivalent normalized results.

- `projects/` contains valid projects and intentional semantic failures.
- `rules/` contains workspace snapshots, Rule ASTs, and expected results.
- `patches/` contains immutable workspace patch application vectors.

Project fixtures `05_invalid_undeclared_write.json` and
`06_const_rejection.json` intentionally exercise error paths. Rule fixtures
may contain `expected` or `expectedError`.

Runners must ignore volatile output fields such as run IDs, timestamps, compile
timestamps, and durations when comparing run artifacts.
