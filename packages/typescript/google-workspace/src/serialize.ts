import { GoogleWorkspaceError } from "./errors.js";
import { MAX_PAYLOAD_CHARS } from "./layout.js";

/**
 * Canonical JSON serialization for sheet payloads.
 *
 * @param value - JSON-serializable value.
 * @returns Stable serialized JSON string.
 */
export function serializePayload(value: unknown): string {
  const text = JSON.stringify(value);
  if (text.length > MAX_PAYLOAD_CHARS) {
    throw new GoogleWorkspaceError(
      `payload exceeds ${MAX_PAYLOAD_CHARS} characters`,
    );
  }
  return text;
}

/**
 * Parse a serialized JSON payload from a sheet cell.
 *
 * @param text - Serialized JSON string.
 * @returns Parsed value.
 */
export function parsePayload<T>(text: string): T {
  return JSON.parse(text) as T;
}

/**
 * Stable digest for idempotency conflict detection.
 *
 * @param value - Request body to digest.
 * @returns Hex SHA-256 digest when available, otherwise a fallback hash.
 */
export async function requestDigest(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Fallback for Node test environments without SubtleCrypto.
  let hash = 0;
  for (const byte of encoded) {
    hash = (hash * 31 + byte) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Generate a UUID-like identifier.
 *
 * @returns Random identifier string.
 */
export function newId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
