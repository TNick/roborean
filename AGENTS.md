# AGENTS

Instructions for humans and coding agents working in this repository.

## Changelog

Before finishing a task that changed **production code** (application or
library source—not tests), update the nearest `CHANGELOG.md`:

1. From edited paths, walk up parents and use the nearest `CHANGELOG.md`.
   In this monorepo that is usually the package folder (e.g.
   `packages/python/roborean_spec/CHANGELOG.md`), not only the repo root.
2. If missing at the package, create one with `# Changelog`,
   `## [Unreleased]`, and empty `### Added`, `### Changed`, `### Fixed`
   sections—match sibling packages.
3. Under `## [Unreleased]`, add `- ` bullets in the right section.
   Write user-facing summaries, not file lists.
4. Follow Keep a Changelog style already used in the repo.

Do **not** update the changelog when:

- The task was read-only.
- Work is planning only (including edits under `research/` or
  `.cursor/plans/`).
- Edits are tests only.
- The user asked not to touch the changelog.

Root [`CHANGELOG.md`](CHANGELOG.md) tracks repo-wide / cross-package notes.
Every publishable package should keep its own `CHANGELOG.md`.

## Source of truth

1. **`schemas/`** — canonical JSON Schema Draft 2020-12 for projects,
   variables, bits, rules, patches, runs, documents, secrets. Python
   (Pydantic) and TypeScript (Ajv + Zod) must stay tied to these files.
   Prefer extending schemas + migrations over inventing parallel models.
2. **`research/`** — architectural decisions and phase plans. Prefer the
   numbered phase docs over improvising structure:
   - `11. Phase 1.md` — foundation / dual-runtime core
   - `12. Phase 2.md` — durable runs + storage
   - `13. Phase 3.md` — documents
   - `14. Phase 4.md` — FastAPI + React platform
3. **`conformance/`** — golden fixtures. Python ↔ TypeScript parity
   failures are release blockers for semantic packages.

The website is a delivery surface. Do not put core semantics only in
`apps/web` or `roborean-api-fastapi`.

## Repository layout (target)

```text
schemas/                 # canonical JSON Schema
conformance/             # golden projects, rules, runs, documents
packages/python/         # roborean_* publishable packages
packages/typescript/     # @roborean/* publishable packages
apps/                    # thin deployables (web, api, cli-diagnostics)
tools/                   # schema sync, conformance, OpenAPI drift
research/                # design docs (not runtime code)
playground/              # scratch, temp files, agent output only
```

Python toolchains: **uv** workspaces. TypeScript: **pnpm** workspaces.
Use the root `Makefile` targets (`init`, `init-d`, `test`, `lint`,
`delint`, `pre-commit`, `conformance`, later `openapi-check` / `e2e`)
instead of ad-hoc one-off install paths when they exist.

`make init-d` installs [pre-commit](https://pre-commit.com) and runs
`pre-commit install` so formatters **rewrite** staged files on commit
(Black/isort for Python, Prettier for TypeScript/JS; flake8 only checks).
To fix the whole tree: `make delint` or `make pre-commit`.

## Environment

Always activate the project virtualenv before running Python commands.
Prefer `venv`, `venv-qt5`, or `venv-qt6` if present; otherwise use the uv
environment the Makefile/`uv sync` creates. Do not install packages into
the global interpreter.

## Coding standards

### Indentation and formatting

| Language | Indent | Format / lint |
|----------|--------|----------------|
| Python | 4 spaces | Black (line length 80), isort (`profile=black`), Flake8 (Google docstrings); pre-commit autofix on commit; optional mypy in dev extras |
| TypeScript / TSX | 2 spaces | Prettier (print width 80); `tsc` clean for packages; pre-commit autofix on commit |
| JSON Schema / JSON fixtures | 2 spaces | Stable key order in golden files when practical |

Lines should not be longer than 80 characters (Black, Prettier, and
Markdown wrap all follow this). A file name should never start with an
underscore.

### Markdown

In repository Markdown (docs, READMEs, `AGENTS.md`, research notes):

- One level-one header per file; blank line after titles; wrap at 80
  characters; fenced code blocks with a language tag.
- Use inline backticks for paths, symbols, DOM ids, CLI commands, and
  other literals (for example `#container`, `apps/web`, `make test`).
- Do not combine bold with backticks (`**`…`**` around a code span, or
  `` **`#container`** ``); backticks alone are enough.
- Reserve `**bold**` for ordinary prose emphasis when no code font
  applies.

### Python style

- Type hints on new/changed public APIs.
- Google-style docstrings: first paragraph on the same line as the opening
  `"""`; document class attributes under `Attributes`; document
  `@property` members on the class docstring.
- All classes must have docstrings. Class docstrings must document each
  class attribute, including private ones.
- Class attributes must be declared with a specific type right after the
  class docstring, leaving a single blank line between them. Public
  attributes should come first, then private attributes, separated by a
  blank line.
- All functions and methods must have docstrings, including functions
  defined inside other functions. Docstrings must document each argument
  (and the return value when useful).
- Split code into short blocks; each block preceded by a blank line and a
  short comment describing what it does. Avoid trailing inline comments.
- Naming: packages/modules `snake_case`, classes `PascalCase`,
  functions/vars `snake_case`, constants `UPPER_SNAKE_CASE`.
- Logging: `logger = logging.getLogger(__name__)`. Never use `print` for
  diagnostics. Prefer `"fmt %s", value` over f-strings in log calls.
  Very verbose traces: `logger.log(1, ...)`. Be conservative at INFO.
- Never use `try: ... except Exception: pass`. In handlers use
  `logger.debug(...)` or `logger.log(1, ..., exc_info=True)` with a short
  explanation.
- When an import is only used for types, import it under
  `if TYPE_CHECKING:` and quote the annotation. Keep `TYPE_CHECKING`
  imports even if the type checker complains locally.
- Avoid using `getattr` when the class is known and already has that
  attribute.
- Domain models are Pydantic (or schema-backed), not SQLAlchemy ORM
  entities. ORM stays in storage adapters and maps to/from domain models.
- YAML: `yaml.safe_load` only for untrusted content.

### TypeScript / React style

**Comment and documentation layout** (new and edited TypeScript under
`packages/typescript/**` and `apps/web/**`):

- Logical blocks of code should start with a `//` comment describing what
  that block does. The comment should be preceded by a blank line.
- When adding a `const` or `let` inside a function, method, or
  arrow-function body, add a brief `//` comment immediately before it,
  preceded by a blank line. The comment should explain what the variable
  holds or what purpose it serves. A single comment may document a
  related group of two to four declarations that share one purpose.
- Standalone `//` comment lines must be preceded by either a blank line
  or another standalone comment line. Standalone `//` comments and
  standalone `/* ... */` or JSDoc block comments must wrap to 80
  characters per line.
- Control-flow blocks (`if`, `for`, `while`, `do`, `switch`, `try`, and
  similar) must be preceded by either a blank line or a comment line.
  Prefer a short `//` comment that explains the logical block.
  Block-bodied arrow functions assigned to class fields or constants
  follow the same spacing rule and should be documented like functions.
- All classes, interfaces, and types (including `type` aliases) should
  have JSDoc comments. Treat both private and public members the same.
  A type alias such as `type ListParams = {...}` is documented like an
  interface. The first line of each type-level docstring must be a short
  summary. A blank JSDoc line (a `*` line with no text) must follow that
  summary and separate it from the rest. Each type member and class
  member must be documented. The documentation block before every class,
  interface, and type-literal member must be preceded by a blank line.
- When a member is typed as a function, use a block JSDoc with a blank
  line after the summary and an `@param` entry for each parameter.
  `@returns` is optional on interface members.
- Functions and methods use the same shape: a one-line summary, then a
  blank JSDoc line, then further content. Document every parameter
  (`@param`) and the return value (`@returns`). Document exceptions the
  caller may need to handle when relevant (`@throws` or prose). Treat
  block-bodied class-field arrows and `const` arrows as functions for
  this rule.
- After a closing block JSDoc (`*/`), continue on the next line with the
  declared symbol (`function`, `class`, `type`, field, etc.); do not
  insert an empty line between `*/` and that declaration—the required
  blank separator stays inside the comment only.
- Each React component should be documented. Prefer function components.
  The props type should be an interface declared above the component when
  it declares at least one member. A component tree that spans more than
  80 lines should be split into smaller components even if they are not
  reusable.

**Package and React conventions:**

- Prefer explicit workspace packages (`@roborean/*`) over dumping logic
  into `apps/web`.
- Browser path: validate, compile, dry-run, diagnostics via
  `@roborean/engine` / `@roborean/validation` without requiring the API.
- Final binary document generation (docx/xlsx/dxf/… bytes) is backend-only;
  the client uses preview contracts (HTML / JSON / drawing IR).
- Prefer modern React patterns already used in the repo; do not add
  `useMemo` / `useCallback` by default unless the package already relies
  on them or measurement requires it.

### Web UI (Material UI)

The product web app and editor packages use **Material UI (MUI)**:

- Depend on `@mui/material`, `@mui/icons-material`, and the Emotion
  peer stack MUI requires.
- Theme and layout primitives belong in `@roborean/ui` (or shared theme
  modules), not copy-pasted per page.
- Prefer MUI components and `sx` / theme tokens over one-off CSS frameworks
  or competing component libraries.
- `apps/web` stays a thin shell (routing, API client wiring, page
  composition). Editor chrome and forms live in `@roborean/editor`.

## Domain rules (do not violate)

1. **Patches, not hidden mutation** — bit execution returns a
   `WorkspacePatch` (and optional document ops). Do not mutate shared
   workspace dicts in place.
2. **Secrets** — model `SecretRef` / workspace-value kinds and `exposure`
   (`backendOnly` | `redactedToClient` | `clientVisible`). Never ship raw
   secret literals to the client, logs, or AI. API responses must redact.
3. **Declared dependencies** — bits declare `reads` / `writes` / `emits`;
   strict compile enforces them.
4. **Effect classes** — honor `effectClass` for retry/idempotency
   (`pure` / `workspace` vs network / external).
5. **Plugins** — installable packages + manifests / entry points. Do not
   execute arbitrary project-hosted code in v1.
6. **Documents** — bits emit document operations; they do not import
   `python-docx` / `openpyxl` / etc. directly.
7. **AI** (when added) — masked workspace views in, schema-valid patches
   out; deterministic renderers own final artifacts.
8. **Phase gates** — do not start Phase N work that Phase N docs mark out
   of scope before earlier exit criteria are green (especially
   `make conformance`).

## Testing

- Framework: pytest (+ coverage where configured). Test modules:
  `*_test.py`. Mirror package layout under each package’s `tests/`.
- Fixtures live in `conftest.py`, not inside test modules.
- Group related cases in nested test classes (up to four levels).
- Mark storage/API integration tests clearly (e.g.
  `@pytest.mark.integration`).
- TypeScript: Vitest (or package-local equivalent); include conformance
  runners that compare normalized outputs to Python.
- After adding or changing behavior, re-run the relevant package tests and
  `make conformance` when semantics touch the dual runtime.
- Prefer short tests with branch coverage over large brittle scenarios.

## Packages (publishable)

Python (illustrative): `roborean-spec`, `roborean-engine`,
`roborean-storage-*`, `roborean-plugins-base`, `roborean-documents-*`,
`roborean-api-fastapi`.

TypeScript (illustrative): `@roborean/spec`, `@roborean/engine`,
`@roborean/validation`, `@roborean/documents-*`, `@roborean/api-types`,
`@roborean/ui`, `@roborean/editor`.

Apps (`apps/web`, `apps/api`, CLI) are thin and not the semantic core.

## Creating a new package

When you add a **publishable** library under `packages/python/` or
`packages/typescript/`, wire it into the monorepo and release pipeline.
Do **not** skip these steps; CI and distlift will not see the package
otherwise.

**Apps** (`apps/web`, `apps/api`, future CLIs) stay **private**: no
`distlift.toml` entries, no PyPI/npm publish, no Trusted Publisher setup.

**Lockstep versioning:** all publishable packages share one version line.
The Git tag `v{version}` is the source of truth (`distlift.toml`
`version_source = "tag"`). Set the new package’s initial `version` in
`pyproject.toml` / `package.json` to match siblings (read any existing
manifest or the latest `v*` tag before choosing).

### Python (`packages/python/roborean_*`)

1. **Scaffold** — match siblings: `pyproject.toml` (Hatchling,
   `src/<import_name>/`, `tests/`), package `CHANGELOG.md`, tests as
   `*_test.py`.
2. **Metadata** in `[project]`:
   - `license = "MIT"`
   - `[project.urls]` with `Homepage` and `Repository` →
     `https://github.com/TNick/roborean`
   - `readme = "README.md"` when the package has a README
   - `requires-python = ">=3.11"`
3. **uv workspace** — add the package path to `[tool.uv.workspace].members`
   in root [`pyproject.toml`](pyproject.toml).
4. **Makefile** — append the path to `PY_PACKAGES` in
   [`Makefile`](Makefile) so `make init` / `init-d` install it editable.
5. **distlift** — in root [`distlift.toml`](distlift.toml):
   - one `[[version_files]]` (`kind = "pyproject"`, `language = "python"`,
     `primary = false`; only `roborean_spec` stays primary)
   - matching `[[build.targets]]` and `[[publish.targets]]` with
     `ecosystem = "python"`
6. **GitHub Actions** — add the same path to the `include` matrix in
   [`.github/workflows/publish.yml`](.github/workflows/publish.yml) with a
   unique `github-environment: pypi-<pypi-project-name>`, and to the editable
   `pip install -e …` list in
   [`.github/workflows/tests.yml`](.github/workflows/tests.yml)
   (`test-python` job).
7. **Registry (maintainer, once per package)** — document in
   [`playground/Developers.md`](playground/Developers.md): create the PyPI
   project, GitHub environment `pypi-<pypi-project-name>`, and a Trusted
   Publisher for workflow `publish.yml` with that **same** environment name.
8. **Changelog** — add an `## [Unreleased]` entry in the new package
   `CHANGELOG.md` (and root `CHANGELOG.md` if the addition is notable
   repo-wide).

### TypeScript (`packages/typescript/*`, scope `@roborean/*`)

1. **Scaffold** — `package.json`, `tsconfig.json` (extend repo
   `tsconfig.base.json`, `composite: true`, `outDir: dist`), `src/`,
   Vitest config if siblings use it, package `CHANGELOG.md`.
2. **Metadata** in `package.json`:
   - `"license": "MIT"`
   - `"publishConfig": { "access": "public" }`
   - `"repository": { "type": "git", "url": "https://github.com/TNick/roborean.git" }`
   - `"files": ["dist"]`, `"exports"`, `"types"` pointing at `dist/`
   - sibling deps as `"workspace:*"` (distlift rewrites on release)
3. **pnpm** — new folder under `packages/typescript/` is picked up by
   [`pnpm-workspace.yaml`](pnpm-workspace.yaml) automatically; run
   `pnpm install` from the repo root.
4. **Root TypeScript build** — add the package path to **`build`** and
   **`lint`** script lists in root [`package.json`](package.json)
   (`tsc -b …`). Order dependencies before dependents in that list when
   practical.
5. **distlift** — in [`distlift.toml`](distlift.toml):
   - `[[version_files]]` with `kind = "package-json"`,
     `language = "javascript"`
   - `[[build.targets]]` / `[[publish.targets]]` with `ecosystem = "npm"`
6. **GitHub Actions** — add `@roborean/<name>` to the **ordered** publish
   loop in [`.github/workflows/publish.yml`](.github/workflows/publish.yml)
   **after** its workspace dependencies (same order as today: spec → engine
   / documents-base → … → editor).
7. **Registry (maintainer)** — ensure the npm user/org can publish
   `@roborean/*`; see [`playground/Developers.md`](playground/Developers.md).
8. **Changelog** — package `CHANGELOG.md` under `## [Unreleased]`.

### After wiring

- Run `make init-d` (or refresh venv + `pnpm install`) and `make test`.
- If the package affects schemas or dual-runtime semantics, run
  `make conformance` (and document fixtures as required by phase docs).
- For a **first release** of a new PyPI/npm name, a maintainer must
  complete registry setup before the tag push; agents should call that out
  in the PR or task summary.

### Checklist (copy for PRs)

| Step | Python | TypeScript |
|------|--------|------------|
| Package scaffold + tests | yes | yes |
| MIT + repository metadata | `pyproject.toml` | `package.json` |
| Workspace (`uv` / pnpm) | root `pyproject.toml` | auto via glob |
| `Makefile` `PY_PACKAGES` | yes | — |
| Root `package.json` `build`/`lint` | — | yes |
| `distlift.toml` (3 blocks) | yes | yes |
| `publish.yml` + `tests.yml` | yes | yes (publish order) |
| Package `CHANGELOG.md` | yes | yes |
| `playground/Developers.md` (new PyPI name) | GitHub env + Trusted Publisher | if new scope/name |

When adding a Python package, the GitHub environment name must match PyPI’s
**Environment name** field exactly (`pypi-roborean-*`).

## Git and commits

- Commits only when the user asks. Imperative mood; optionally prefix with
  package name.
- Do not commit secrets (`.env`, credentials, etc.).
- Prefer commits that pass `make lint` and `make test`.
- Agent-created commits must avoid GPG signing that prompts for a
  passphrase (`gpg.with` / signing disabled for that commit as allowed by
  project practice).

## Scratch, temp, and output files

Never create temporary files, scratch notes, dumps, CLI output captures,
or other working artifacts inside the source tree (`packages/`, `apps/`,
`schemas/`, `conformance/`, `tools/`, `research/`, or the repo root
outside `playground/`).

Use `playground/` at the repo root for all of that. It exists exactly so
agents and humans can experiment and leave output without polluting
publishable packages or golden fixtures.

Put throwaway experiments under `playground/` as well. Do not land
experiments in publishable packages without tests and changelog entries.
