import type { BitTypeManifest } from "@roborean/spec";
import { builtinManifests } from "@roborean/engine";

const manifestByType = new Map<string, BitTypeManifest>();

for (const manifest of builtinManifests) {
  manifestByType.set(manifest.typeId, manifest);
}

/**
 * Resolve a bit type manifest for editor forms.
 *
 * @param typeId - Bit type identifier.
 * @returns Manifest when known, otherwise undefined.
 */
export function getBitManifest(typeId: string): BitTypeManifest | undefined {
  return manifestByType.get(typeId);
}

/**
 * All manifests exposed to the bit config form (including document bits).
 */
export function listBitManifests(): BitTypeManifest[] {
  return [...manifestByType.values()];
}
