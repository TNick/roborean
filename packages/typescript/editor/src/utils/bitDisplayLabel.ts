import type { Bit } from "@roborean/spec";

/** Fallback shown when a bit has no user-facing label. */
export const BIT_NO_LABEL = "(no label)";

/**
 * User-facing display name for a bit.
 *
 * @param bit - Bit definition, or a label string.
 * @returns Trimmed label, or `(no label)` when empty.
 */
export function bitDisplayLabel(
  bit: Pick<Bit, "label"> | string | null | undefined,
): string {
  if (typeof bit === "string") {
    const trimmed = bit.trim();
    return trimmed || BIT_NO_LABEL;
  }

  const trimmed = bit?.label?.trim() ?? "";
  return trimmed || BIT_NO_LABEL;
}
