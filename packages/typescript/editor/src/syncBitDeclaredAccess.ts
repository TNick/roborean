import type { Bit } from "@roborean/spec";

/**
 * Ensure declared reads/writes match config for built-in workspace bits.
 *
 * The compiler requires `roborean.set_variable` / `roborean.copy_variable`
 * to list their config keys in `writes` / `reads`. The editor owns those
 * fields so authors do not edit them by hand.
 *
 * @param bit - Bit definition to normalize.
 * @returns Bit with synchronized dependency declarations.
 */
export function syncBitDeclaredAccess(bit: Bit): Bit {
  if (bit.type === "roborean.set_variable") {
    // Target key is the only workspace write for this bit type.
    const key = typeof bit.config.key === "string" ? bit.config.key.trim() : "";
    const writes = key ? [key] : [];
    if (sameKeys(bit.writes, writes) && bit.reads.length === 0) {
      return bit;
    }
    return { ...bit, reads: [], writes };
  }

  if (bit.type === "roborean.copy_variable") {
    // Copy reads `from` and writes `to`.
    const from =
      typeof bit.config.from === "string" ? bit.config.from.trim() : "";
    const to = typeof bit.config.to === "string" ? bit.config.to.trim() : "";
    const reads = from ? [from] : [];
    const writes = to ? [to] : [];
    if (sameKeys(bit.reads, reads) && sameKeys(bit.writes, writes)) {
      return bit;
    }
    return { ...bit, reads, writes };
  }

  return bit;
}

/**
 * Compare dependency key lists as ordered arrays.
 *
 * @param left - First key list.
 * @param right - Second key list.
 * @returns True when both lists match exactly.
 */
function sameKeys(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((key, index) => key === right[index]);
}
