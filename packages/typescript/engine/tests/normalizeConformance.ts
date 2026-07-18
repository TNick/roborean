/** Volatile run/compile fields stripped before golden JSON comparison. */
const VOLATILE = new Set([
  "runId",
  "startedAt",
  "finishedAt",
  "durationMs",
  "compiledAt",
]);

/**
 * Recursively remove volatile keys (matches Python ``run_conformance.normalize``).
 *
 * @param value - JSON-like value to normalize.
 * @returns Copy without volatile timestamp/id fields.
 */
export function normalizeConformance(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeConformance(item));
  }
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    if (VOLATILE.has(key)) {
      continue;
    }
    out[key] = normalizeConformance(item);
  }
  return out;
}
