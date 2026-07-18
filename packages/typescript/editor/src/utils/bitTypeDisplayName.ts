import type { BitTypeManifest } from "@roborean/spec";

import { getBitManifest } from "../bitManifestRegistry.js";

/**
 * Derive a readable fallback label from a bit type id.
 *
 * @param typeId - Bit type identifier.
 * @returns Title-cased words from the final id segment.
 */
function fallbackBitTypeName(typeId: string): string {
  const tail = typeId.split(".").pop() ?? typeId;

  return tail
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Resolve the user-facing name for a bit type.
 *
 * @param typeId - Bit type identifier.
 * @param manifest - Optional manifest when already loaded.
 * @returns Manifest name or a derived fallback label.
 */
export function bitTypeDisplayName(
  typeId: string,
  manifest?: BitTypeManifest,
): string {
  const resolved = manifest ?? getBitManifest(typeId);
  const trimmed = resolved?.name?.trim();

  if (trimmed) {
    return trimmed;
  }

  return fallbackBitTypeName(typeId);
}
