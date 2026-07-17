import type { RunResults } from "@roborean/engine";

const VOLATILE = new Set([
  "runId",
  "startedAt",
  "finishedAt",
  "durationMs",
  "compiledAt",
  "projectId",
  "projectDigest",
  "inputWorkspaceHash",
  "finalWorkspaceHash",
]);

export function normalizeRun(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeRun(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(record)) {
      if (VOLATILE.has(key)) {
        continue;
      }
      next[key] = normalizeRun(item);
    }
    return next;
  }
  return value;
}

export function workspacePatchesFromRun(
  run: RunResults | Record<string, unknown>,
): unknown {
  const bitResults = (run as RunResults).bitResults ?? [];
  return bitResults.map((bit) => ({
    bitId: bit.bitId,
    workspacePatch: bit.workspacePatch,
    status: bit.status,
  }));
}

export function assertNoBackendOnlySecrets(payload: string): void {
  if (payload.includes('"kind":"secret_literal"')) {
    throw new Error("API payload contained secret_literal");
  }
  if (payload.includes("super-secret-token")) {
    throw new Error("API payload contained raw secret value");
  }
}
