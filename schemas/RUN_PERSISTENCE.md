# Run Persistence

Normative notes for durable runs introduced in Phase 2.

## Lifecycle

```text
queued -> running -> succeeded | failed
                 \-> cancelled
```

`RunService.create_and_execute` inserts a `queued` record, transitions to
`running`, executes the Phase 1 pure runner, then persists `results` and
`diff`.

## Idempotency

- Key: `(projectId, idempotencyKey)`.
- Body digest covers the request excluding volatile `requestedAt`.
- Same key + same digest returns the existing `RunRecord` without
  re-execution.
- Same key + different digest raises a conflict.

## Retry matrix

| Effect class | Default retry |
|--------------|---------------|
| `pure` | allowed (`replay_pure`) |
| `workspace` | allowed (`rerun_with_current`) |
| `document` | allowed (`rerun_with_current`) |
| `filesystem` | forbidden unless forced |
| `network` | forbidden unless forced |
| `external-process` | forbidden unless forced |
| `transactional-external` | forbidden unless forced |

Retries create a new `runId` with `retryOfRunId` set and a new idempotency
key `"{original}:retry:{attempt}"` unless the caller supplies one.

## Secret resolution precedence

1. Non-secret `workspaceOverrides` on the request
2. Project variable defaults
3. `SecretResolver` for `secret_ref` values (`env` or in-memory)

Duplicate secret names across providers are a hard error. Diffs and
persisted artifacts never store resolved secret values.
