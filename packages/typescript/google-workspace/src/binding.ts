import { GoogleWorkspaceError } from "./errors.js";
import {
  DATA_SHEET_NAME,
  ROBOREAN_FOLDER_NAME,
  SHEET_HEADERS,
  SHEET_TABS,
  WORKSPACE_SCHEMA_VERSION,
} from "./layout.js";
import type { GoogleApis, WorkspaceBinding } from "./types.js";

/**
 * localStorage key for the non-sensitive workspace binding.
 */
export const BINDING_STORAGE_KEY = "roborean.googleWorkspace.binding";

/**
 * Load a previously selected workspace binding from localStorage.
 *
 * @param storage - Browser storage implementation.
 * @returns Parsed binding or null when absent/invalid.
 */
export function loadBinding(
  storage: Pick<Storage, "getItem"> = globalThis.localStorage,
): WorkspaceBinding | null {
  // Skip when storage is unavailable (SSR / unit tests without DOM).
  if (!storage || typeof storage.getItem !== "function") {
    return null;
  }

  const raw = storage.getItem(BINDING_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceBinding>;
    if (
      typeof parsed.rootFolderId !== "string" ||
      typeof parsed.rootFolderName !== "string" ||
      typeof parsed.spreadsheetId !== "string" ||
      typeof parsed.schemaVersion !== "number"
    ) {
      return null;
    }
    return {
      rootFolderId: parsed.rootFolderId,
      rootFolderName: parsed.rootFolderName,
      spreadsheetId: parsed.spreadsheetId,
      schemaVersion: parsed.schemaVersion,
      connectedAt: parsed.connectedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Persist a workspace binding to localStorage.
 *
 * @param binding - Binding to store.
 * @param storage - Browser storage implementation.
 */
export function saveBinding(
  binding: WorkspaceBinding,
  storage: Pick<Storage, "setItem"> = globalThis.localStorage,
): void {
  storage.setItem(BINDING_STORAGE_KEY, JSON.stringify(binding));
}

/**
 * Remove any stored workspace binding.
 *
 * @param storage - Browser storage implementation.
 */
export function clearBinding(
  storage: Pick<Storage, "removeItem"> = globalThis.localStorage,
): void {
  storage.removeItem(BINDING_STORAGE_KEY);
}

/**
 * Initialize the Roborean layout under a user-selected Drive folder.
 *
 * @param apis - Google API clients.
 * @param rootFolderId - User-selected parent folder id.
 * @param rootFolderName - Display name of the selected folder.
 * @returns Binding metadata for the initialized workspace.
 */
export async function initializeWorkspace(
  apis: GoogleApis,
  rootFolderId: string,
  rootFolderName: string,
): Promise<WorkspaceBinding> {
  // Ensure the marker folder exists under the selected root.
  let roborean = await apis.drive.findChild(
    rootFolderId,
    ROBOREAN_FOLDER_NAME,
    "application/vnd.google-apps.folder",
  );
  if (!roborean) {
    roborean = await apis.drive.createFolder(
      ROBOREAN_FOLDER_NAME,
      rootFolderId,
    );
  }

  // Ensure the companion spreadsheet exists under Roborean/.
  let sheet = await apis.drive.findChild(
    roborean.id,
    DATA_SHEET_NAME,
    "application/vnd.google-apps.spreadsheet",
  );
  if (!sheet) {
    sheet = await apis.drive.createSpreadsheet(DATA_SHEET_NAME, roborean.id);
  }

  await ensureSheetSchema(apis, sheet.id);

  return {
    rootFolderId,
    rootFolderName,
    spreadsheetId: sheet.id,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    connectedAt: new Date().toISOString(),
  };
}

/**
 * Validate that a stored binding still points at accessible Drive resources.
 *
 * @param apis - Google API clients.
 * @param binding - Previously stored binding.
 * @returns Refreshed binding with a new connectedAt timestamp.
 */
export async function validateBinding(
  apis: GoogleApis,
  binding: WorkspaceBinding,
): Promise<WorkspaceBinding> {
  try {
    await apis.drive.getFile(binding.rootFolderId);
    await apis.drive.getFile(binding.spreadsheetId);
  } catch {
    throw new GoogleWorkspaceError(
      "Selected Google Drive folder is no longer accessible",
    );
  }

  await ensureSheetSchema(apis, binding.spreadsheetId);

  return {
    ...binding,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    connectedAt: new Date().toISOString(),
  };
}

/**
 * Create required tabs and write schema version metadata.
 *
 * @param apis - Google API clients.
 * @param spreadsheetId - Companion spreadsheet id.
 */
export async function ensureSheetSchema(
  apis: GoogleApis,
  spreadsheetId: string,
): Promise<void> {
  const tabNames = Object.values(SHEET_TABS);
  await apis.sheets.ensureTabs(spreadsheetId, tabNames);

  // Seed empty tabs with header rows when they have no data yet.
  for (const tabName of tabNames) {
    const rows = await apis.sheets.readRows(spreadsheetId, tabName);
    if (rows.length === 0) {
      await apis.sheets.writeRows(spreadsheetId, tabName, [
        SHEET_HEADERS[tabName],
      ]);
    }
  }

  // Persist the layout version in the meta tab.
  await apis.sheets.writeRows(spreadsheetId, SHEET_TABS.meta, [
    SHEET_HEADERS.meta,
    ["schemaVersion", String(WORKSPACE_SCHEMA_VERSION)],
  ]);
}
