# Project format

Project files conform to `project.schema.json` and currently use
`schemaVersion` `1.0.0`. A project declares its workspace, ordered bits,
document stubs, template references, and metadata.

| Field | Required | Meaning |
| --- | --- | --- |
| `schemaVersion` | Yes | The frozen Phase 1 project format version |
| `id`, `name` | Yes | Stable project identity and display name |
| `description` | No | Human-readable project description |
| `pluginRequirements` | Yes | Plugin names and version ranges |
| `workspace` | Yes | Ordered variable definitions |
| `bits` | Yes | Ordered conditional work units |
| `documents`, `templates` | Yes | Document and template declarations |
| `metadata` | Yes | Extension metadata |

Workspace variables declare an inline payload schema, a wrapped default value,
mutability through `const`, and an exposure policy. Secret values use
`secret_ref` wrappers; project files never contain secret literals.

Each bit declares its reads, writes, and emits. The compiler enforces these
declared dependencies in strict mode. A bit's `when` value is either `true`
or a Rule AST described in [RULE_SEMANTICS.md](RULE_SEMANTICS.md).

See [examples/01_minimal.project.json](examples/01_minimal.project.json) for
the smallest complete project.
