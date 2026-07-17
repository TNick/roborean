# CLI diagnostics

Use the `roborean` command from the `roborean-engine` package to validate,
compile, run, and inspect Roborean projects.

```text
roborean validate conformance/projects/01_minimal.json
roborean compile conformance/projects/02_set_and_copy.json
roborean run conformance/projects/02_set_and_copy.json
roborean explain-bit conformance/projects/02_set_and_copy.json set_title

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
