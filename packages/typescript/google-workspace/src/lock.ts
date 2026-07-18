import { ConflictError } from "./errors.js";
import { SHEET_HEADERS, SHEET_TABS } from "./layout.js";
import type { GoogleApis } from "./types.js";

/**
 * Acquire a short-lived writer lock in the companion spreadsheet.
 *
 * @param apis - Google API clients.
 * @param spreadsheetId - Companion spreadsheet id.
 * @param owner - Browser tab / session owner token.
 * @param ttlMs - Lock time-to-live in milliseconds.
 * @returns Lock token that must be passed to releaseLock.
 */
export async function acquireLock(
  apis: GoogleApis,
  spreadsheetId: string,
  owner: string,
  ttlMs = 15_000,
): Promise<string> {
  const rows = await apis.sheets.readRows(spreadsheetId, SHEET_TABS.lock);
  const now = Date.now();
  const dataRows = rows.slice(1);
  const existing = dataRows.find((row) => row[0] === "writer");

  // Reject when another writer still holds an unexpired lock.
  if (existing) {
    const expiresAt = Date.parse(existing[2] ?? "");
    if (!Number.isNaN(expiresAt) && expiresAt > now && existing[1] !== owner) {
      throw new ConflictError("workspace is locked by another browser session");
    }
  }

  const token = `${owner}:${now}`;
  const expiresAt = new Date(now + ttlMs).toISOString();
  await apis.sheets.writeRows(spreadsheetId, SHEET_TABS.lock, [
    SHEET_HEADERS.lock,
    ["writer", owner, expiresAt, token],
  ]);
  return token;
}

/**
 * Release a previously acquired writer lock when still owned.
 *
 * @param apis - Google API clients.
 * @param spreadsheetId - Companion spreadsheet id.
 * @param token - Token returned by acquireLock.
 */
export async function releaseLock(
  apis: GoogleApis,
  spreadsheetId: string,
  token: string,
): Promise<void> {
  const rows = await apis.sheets.readRows(spreadsheetId, SHEET_TABS.lock);
  const dataRows = rows.slice(1);
  const existing = dataRows.find((row) => row[0] === "writer");
  if (!existing || existing[3] !== token) {
    return;
  }
  await apis.sheets.writeRows(spreadsheetId, SHEET_TABS.lock, [
    SHEET_HEADERS.lock,
  ]);
}

/**
 * Run a mutation while holding the workspace writer lock.
 *
 * @param apis - Google API clients.
 * @param spreadsheetId - Companion spreadsheet id.
 * @param owner - Browser tab / session owner token.
 * @param fn - Mutation to execute under the lock.
 * @returns Result of the mutation.
 */
export async function withWorkspaceLock<T>(
  apis: GoogleApis,
  spreadsheetId: string,
  owner: string,
  fn: () => Promise<T>,
): Promise<T> {
  const token = await acquireLock(apis, spreadsheetId, owner);
  try {
    return await fn();
  } finally {
    await releaseLock(apis, spreadsheetId, token);
  }
}
