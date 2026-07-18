import type { Project } from "@roborean/spec";

/**
 * Non-sensitive connection metadata persisted in the browser.
 */
export type WorkspaceBinding = {
  /**
   * Drive folder id chosen by the user as the write root.
   */
  rootFolderId: string;

  /**
   * Display name of the selected Drive folder.
   */
  rootFolderName: string;

  /**
   * Companion spreadsheet id under the root folder.
   */
  spreadsheetId: string;

  /**
   * Layout/schema version of the companion sheet tabs.
   */
  schemaVersion: number;

  /**
   * ISO timestamp when the binding was last validated.
   */
  connectedAt?: string;
};

/**
 * Indexed project summary stored in the companion sheet.
 */
export type ProjectSummaryRow = {
  /**
   * Stable project identifier.
   */
  id: string;

  /**
   * Human-readable project name.
   */
  name: string;

  /**
   * Project schema version string.
   */
  schemaVersion: string;

  /**
   * Optimistic concurrency version for the project row.
   */
  rowVersion: number;

  /**
   * Canonical project JSON payload.
   */
  payload: Project;
};

/**
 * Durable run record stored in the companion sheet.
 */
export type RunRecordRow = {
  /**
   * Durable run identifier.
   */
  runId: string;

  /**
   * Owning project identifier.
   */
  projectId: string;

  /**
   * Client-supplied idempotency key.
   */
  idempotencyKey: string;

  /**
   * Digest of the create-run request body.
   */
  requestDigest: string;

  /**
   * High-level run status.
   */
  status: string;

  /**
   * ISO creation timestamp.
   */
  createdAt: string;

  /**
   * ISO finish timestamp when available.
   */
  finishedAt?: string | null;

  /**
   * Optimistic concurrency version for the run row.
   */
  rowVersion: number;

  /**
   * Canonical run JSON payload.
   */
  payload: Record<string, unknown>;
};

/**
 * Reference to a generated Google Doc artifact.
 */
export type DocumentRefRow = {
  /**
   * Owning run identifier.
   */
  runId: string;

  /**
   * Document definition identifier.
   */
  documentId: string;

  /**
   * Google Drive / Docs file id.
   */
  fileId: string;

  /**
   * Openable Google Docs URL.
   */
  webViewLink: string;

  /**
   * MIME type of the stored document.
   */
  mediaType: string;
};

/**
 * Opaque Drive file created under the bound root.
 */
export type DriveFile = {
  /**
   * Drive file id.
   */
  id: string;

  /**
   * File name.
   */
  name: string;

  /**
   * MIME type.
   */
  mimeType: string;

  /**
   * Parent folder ids.
   */
  parents: string[];

  /**
   * Openable web URL when available.
   */
  webViewLink?: string;
};

/**
 * Minimal Drive API surface used by the adapter.
 */
export type DriveApi = {
  /**
   * Create a folder under a parent.
   *
   * @param name - Folder name.
   * @param parentId - Parent folder id.
   * @returns Created folder metadata.
   */
  createFolder: (name: string, parentId: string) => Promise<DriveFile>;

  /**
   * Create a Google Sheet under a parent.
   *
   * @param name - Spreadsheet name.
   * @param parentId - Parent folder id.
   * @returns Created spreadsheet file metadata.
   */
  createSpreadsheet: (name: string, parentId: string) => Promise<DriveFile>;

  /**
   * Create a Google Doc under a parent.
   *
   * @param name - Document name.
   * @param parentId - Parent folder id.
   * @returns Created document file metadata.
   */
  createDocument: (name: string, parentId: string) => Promise<DriveFile>;

  /**
   * Copy a Drive file into a parent folder.
   *
   * @param fileId - Source file id.
   * @param name - Name for the copy.
   * @param parentId - Destination parent folder id.
   * @returns Copied file metadata.
   */
  copyFile: (
    fileId: string,
    name: string,
    parentId: string,
  ) => Promise<DriveFile>;

  /**
   * Export a Google Doc (or other exportable file) as plain text.
   *
   * @param fileId - Drive file id.
   * @param mimeType - Export MIME type.
   * @returns Exported UTF-8 text.
   */
  exportText: (fileId: string, mimeType?: string) => Promise<string>;

  /**
   * Find a direct child by exact name.
   *
   * @param parentId - Parent folder id.
   * @param name - Exact child name.
   * @param mimeType - Optional MIME type filter.
   * @returns Matching file or null.
   */
  findChild: (
    parentId: string,
    name: string,
    mimeType?: string,
  ) => Promise<DriveFile | null>;

  /**
   * Load file metadata by id.
   *
   * @param fileId - Drive file id.
   * @returns File metadata.
   */
  getFile: (fileId: string) => Promise<DriveFile>;

  /**
   * Delete a Drive file by id.
   *
   * @param fileId - Drive file id.
   */
  deleteFile: (fileId: string) => Promise<void>;
};

/**
 * Minimal Sheets API surface used by the adapter.
 */
export type SheetsApi = {
  /**
   * Ensure required tabs and header rows exist.
   *
   * @param spreadsheetId - Companion spreadsheet id.
   * @param tabNames - Required tab names.
   */
  ensureTabs: (spreadsheetId: string, tabNames: string[]) => Promise<void>;

  /**
   * Read all non-header rows from a tab.
   *
   * @param spreadsheetId - Companion spreadsheet id.
   * @param tabName - Tab name.
   * @returns Row values as string arrays.
   */
  readRows: (spreadsheetId: string, tabName: string) => Promise<string[][]>;

  /**
   * Replace all data rows in a tab (headers preserved).
   *
   * @param spreadsheetId - Companion spreadsheet id.
   * @param tabName - Tab name.
   * @param rows - Data rows to write.
   */
  writeRows: (
    spreadsheetId: string,
    tabName: string,
    rows: string[][],
  ) => Promise<void>;
};

/**
 * Minimal Docs API surface used by the adapter.
 */
export type DocsApi = {
  /**
   * Apply Docs API batchUpdate requests.
   *
   * @param documentId - Google Docs file id.
   * @param requests - batchUpdate request objects.
   */
  batchUpdate: (
    documentId: string,
    requests: Array<Record<string, unknown>>,
  ) => Promise<void>;
};

/**
 * Bundled Google API clients for one browser session.
 */
export type GoogleApis = {
  /**
   * Drive client.
   */
  drive: DriveApi;

  /**
   * Sheets client.
   */
  sheets: SheetsApi;

  /**
   * Docs client.
   */
  docs: DocsApi;
};

/**
 * Auth token provider used by live Google clients.
 */
export type AccessTokenProvider = {
  /**
   * Return a usable OAuth access token.
   *
   * @returns Access token string.
   */
  getAccessToken: () => Promise<string>;
};
