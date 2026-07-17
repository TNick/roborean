import type { DocumentOperation, DriverManifest } from "./types.js";

export type Diagnostic = { severity: "error" | "warning"; code: string; message: string };

export function validateDocumentOperations(
  ops: DocumentOperation[],
  manifest: DriverManifest,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const op of ops) {
    if (!manifest.capabilities.includes(op.op)) {
      diagnostics.push({
        severity: "error",
        code: "E_CAPABILITY_MISSING",
        message: `Unsupported op ${op.op} for ${manifest.driverId}`,
      });
    }
  }
  return diagnostics;
}
