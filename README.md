# Roborean

Roborean is a **project → workspace → bits → documents** system for
repeatable, template-driven content generation. A project is a portable
package: typed global variables, ordered conditional bits, and document
definitions that render from templates into text, Markdown, Office, DXF,
images, and similar formats. Try the
[hosted web app](https://tnick.github.io/roborean/).

The product center is a **versioned project format and dual-runtime
execution semantics**, not the website. Publishable Python and TypeScript
libraries implement the same schemas so projects can validate and dry-run in
the browser, run fully on a Python host, or both.

## Core concepts

| Concept | Role |
|---------|------|
| **Project** | Self-contained definition: metadata, workspace, bits, documents, templates, plugin requirements |
| **Workspace** | Typed global variables (defaults, mutability, exposure / secrets) |
| **Bit** | Conditionally active unit of work; returns workspace patches and document ops |
| **Document** | Template-backed output produced by a driver (text, markdown, xlsx, docx, dxf, image, …) |
| **Run** | Durable execution record: inputs, active bits, patches, artifacts, diagnostics |

## Architecture (high level)

```text
schemas/  (JSON Schema Draft 2020-12)     ← source of truth
    ├── Python: roborean-spec + roborean-engine
    └── TypeScript: @roborean/spec + @roborean/engine
            ├── storage adapters (dict/JSON/YAML, SQLAlchemy)
            ├── document drivers
            ├── FastAPI service
            └── React editor (browser validate / dry-run)
```

Design pillars:

- Schema-first parity across languages (shared golden conformance fixtures).
- Bits apply **workspace patches**; they do not mutate shared state in place.
- Secrets use `SecretRef` / exposure policies, not raw values in client exports.
- Persistence and document formats sit behind ports/adapters.
- AI (later) proposes schema-valid patches on masked views; it does not own
  project state or final rendering.

## Stack

| Layer | Choice |
|-------|--------|
| Canonical schemas | JSON Schema Draft 2020-12 under `schemas/` |
| Python | Pydantic v2, uv workspaces, FastAPI for the API |
| TypeScript | Ajv + Zod, pnpm workspaces, React + Vite, Material UI |
| Persistence | In-memory / JSON·YAML dict store; SQLAlchemy relational adapter |
| Documents | Driver packages per format; browser previews where supported |

## Roadmap

Detailed plans live under [`research/`](research/):

| Phase | Focus |
|-------|--------|
| 1 Foundation | Spec + dual-runtime core, rules, patches, conformance |
| 2 Runtime | Durable runs, storage ports/adapters, idempotency |
| 3 Documents | Drivers, templates, IR, previews |
| 4 Platform | FastAPI + React editor + publishable UI packages |
| Later | AI assistant layer; migration harness for related products |

## Status

**Phases 1–4 are implemented**: canonical schemas, dual-runtime cores,
durable runs/stores, document drivers, FastAPI + React platform shell, and CLI
`render` / `preview` / `drivers list`.

## Development

See [`AGENTS.md`](AGENTS.md) for contributor and agent conventions.

```bash
make init-d           # venv, packages, pnpm, e2e-ai, pre-commit hooks
make webg             # Google Drive-only web app; no FastAPI
make delint           # autofix Python + TypeScript/JS format
make pre-commit       # run all hooks on the tree
make test
make verify             # full semantic + OpenAPI + dry-run parity
make conformance
make e2e              # Playwright (or e2e-ai verify locally)
e2e-ai doctor         # config check from repo root
e2e-ai repair         # optional AI fix loop when tests fail
roborean validate conformance/projects/02_set_and_copy.json
roborean run conformance/projects/02_set_and_copy.json
```

CLI reference (validate, compile, durable runs, render/preview):
[`packages/python/roborean_engine/README.md`](packages/python/roborean_engine/README.md).

Local registry overrides: this repo pins PyPI via `pip.ini` and npm via
`.npmrc` so installs do not depend on a private Verdaccio at `127.0.0.1:4873`.
Activate `venv` before Python commands.

Research background: [`research/01. Initial idea.md`](research/01.%20Initial%20idea.md)
and following files.
