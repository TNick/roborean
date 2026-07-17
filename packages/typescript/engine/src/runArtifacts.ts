import { readFileSync } from "node:fs";
import type { RunResults } from "./runner.js";

/** Load a persisted run-results.json artifact for diagnostics. */
export function loadRunResults(path: string): RunResults {
  return JSON.parse(readFileSync(path, "utf8")) as RunResults;
}

export type RunStatus =
  "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface RunRecordSummary {
  runId: string;
  idempotencyKey: string;
  projectId: string;
  status: RunStatus;
  results?: RunResults | null;
}

/** Load a persisted run-record.json artifact for diagnostics. */
export function loadRunRecord(path: string): RunRecordSummary {
  return JSON.parse(readFileSync(path, "utf8")) as RunRecordSummary;
}
