# roborean-engine

Deterministic compiler, runner, durable run service, and document rendering
for Roborean projects.

Install from the monorepo with `make init-d`, then use the `roborean` console
script (entry point: `roborean_engine.cli:main`).

## Durable storage

| Store | CLI prefix | Typical use |
| --- | --- | --- |
| Dict (filesystem) | `dict:./path` | Local dev, single process, conformance |
| SQLAlchemy | `sql:…` | Shared durable runs across multiple API workers |

The dict adapter uses exclusive idempotency index files for concurrent
writers on the same root. Prefer `sql:` when more than one process writes
the same store.

## CLI

Validate, compile, run, and inspect projects:

```text
roborean validate conformance/projects/01_minimal.json
roborean compile conformance/projects/02_set_and_copy.json
roborean run conformance/projects/02_set_and_copy.json
roborean explain-bit conformance/projects/02_set_and_copy.json set_title
```

Durable runs with the dict store:

```text
roborean store init --store dict:./.roborean
roborean run conformance/packages/02_set_and_copy \
  --idempotency-key demo-1 \
  --store dict:./.roborean
roborean runs list --project example.set-and-copy --store dict:./.roborean
roborean runs show <runId> --store dict:./.roborean
roborean runs retry <runId> --store dict:./.roborean
```

SQL store example:

```text
roborean store init --store sql:sqlite:///./roborean.db
roborean run conformance/packages/02_set_and_copy \
  --idempotency-key demo-sql-1 \
  --store sql:sqlite:///./roborean.db
```

Document drivers (package directories):

```text
roborean drivers list
roborean render conformance/packages/<package> --out ./out
roborean preview conformance/packages/<package> --document <id> --format json
```
