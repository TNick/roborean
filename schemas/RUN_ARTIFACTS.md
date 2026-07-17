# Run artifacts

Compilation produces a `compiled-project` artifact. It captures the normalized
project, resolved bit manifests, activation expressions, dependency map,
plugin versions, digest, and compile diagnostics. Its `digest` is the SHA-256
of the normalized project.

Execution produces a `run-results` artifact. It records project identity and
digest, start and finish timestamps, workspace hashes, overall status,
per-bit results, artifacts, and engine/rule-profile versions.

Each bit result records whether it was active, its activation reason, outcome,
duration, workspace patch, document operations, diagnostics, and plugin
version. Phase 1 requires document operations and artifacts to be empty.

Comparison tools should ignore volatile values such as `runId`, timestamps,
`compiledAt`, and `durationMs` while comparing conformance output.
