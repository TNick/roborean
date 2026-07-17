import type { DocumentOperation, DriverManifest } from "./types.js";

export function assertOpAllowed(
  manifest: DriverManifest,
  op: DocumentOperation,
): void {
  if (!manifest.capabilities.includes(op.op)) {
    throw new Error(`Driver ${manifest.driverId} does not support ${op.op}`);
  }
}
