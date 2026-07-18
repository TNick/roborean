/**
 * Current companion spreadsheet layout version.
 */
export const WORKSPACE_SCHEMA_VERSION = 1;

/**
 * Marker folder created under the user-selected root.
 */
export const ROBOREAN_FOLDER_NAME = "Roborean";

/**
 * Companion spreadsheet name under the Roborean folder.
 */
export const DATA_SHEET_NAME = "Roborean data";

/**
 * Fixed tab names in the companion spreadsheet.
 */
export const SHEET_TABS = {
  meta: "meta",
  projects: "projects",
  revisions: "revisions",
  runs: "runs",
  idempotency: "idempotency",
  documents: "documents",
  lock: "lock",
} as const;

/**
 * Header rows for each companion spreadsheet tab.
 */
export const SHEET_HEADERS: Record<
  (typeof SHEET_TABS)[keyof typeof SHEET_TABS],
  string[]
> = {
  meta: ["key", "value"],
  projects: [
    "id",
    "name",
    "schemaVersion",
    "rowVersion",
    "updatedAt",
    "payload",
  ],
  revisions: ["projectId", "revision", "createdAt", "payload"],
  runs: [
    "runId",
    "projectId",
    "idempotencyKey",
    "requestDigest",
    "status",
    "createdAt",
    "finishedAt",
    "rowVersion",
    "payload",
  ],
  idempotency: ["projectId", "idempotencyKey", "runId", "requestDigest"],
  documents: ["runId", "documentId", "fileId", "webViewLink", "mediaType"],
  lock: ["key", "owner", "expiresAt", "token"],
};

/**
 * Maximum serialized JSON payload size stored in a sheet cell.
 */
export const MAX_PAYLOAD_CHARS = 45_000;

/**
 * Sub-folder name for hand-authored Google Doc templates.
 */
export const TEMPLATES_FOLDER_NAME = "templates";

/**
 * Build the project documents folder name.
 *
 * @param projectId - Project identifier.
 * @returns Folder name under Roborean/.
 */
export function projectFolderName(projectId: string): string {
  return `project-${projectId}`;
}
