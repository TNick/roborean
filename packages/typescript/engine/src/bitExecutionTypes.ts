import type { WorkspacePatch } from "@roborean/spec";

/**
 * Result of executing one bit in the TypeScript engine runtime.
 */
export type BitExecutionResult = {
  /** Workspace mutations produced by the bit. */
  workspacePatch: WorkspacePatch;

  /** Document operations emitted for preview or backend drivers. */
  documentOps: unknown[];
};
