export {
  clearBinding,
  BINDING_STORAGE_KEY,
  initializeWorkspace,
  loadBinding,
  saveBinding,
  validateBinding,
  ensureSheetSchema,
} from "./binding.js";
export {
  createBrowserTokenProvider,
  DEFAULT_GOOGLE_SCOPES,
  isValidGoogleClientId,
} from "./auth.js";
export type {
  BrowserTokenProviderOptions,
  GoogleIdentityWindow,
  GoogleTokenClient,
} from "./auth.js";
export {
  createGoogleWorkspaceClient,
  type GoogleRunCreate,
  type GoogleWorkspaceClient,
  type GoogleWorkspaceClientOptions,
} from "./client.js";
export {
  ensureProjectFolder,
  ensureRoboreanFolder,
  ensureTemplatesFolder,
} from "./driveFolders.js";
export {
  applyOpsToGoogleDoc,
  applyOpsToPlainText,
  documentOpsToDocsRequests,
  GOOGLE_DOCS_DRIVER_MANIFEST,
  plainTextToPreviewHtml,
  type DocsRenderMode,
  type DocsRequestOptions,
} from "./docsDriver.js";
export {
  ConflictError,
  GoogleWorkspaceError,
  NotFoundError,
} from "./errors.js";
export { createMemoryGoogleApis } from "./fake/memoryApis.js";
export type { MemoryGoogleApis } from "./fake/memoryApis.js";
export { createLiveGoogleApis } from "./googleApis.js";
export type { LiveGoogleApisOptions } from "./googleApis.js";
export {
  DATA_SHEET_NAME,
  MAX_PAYLOAD_CHARS,
  ROBOREAN_FOLDER_NAME,
  SHEET_HEADERS,
  SHEET_TABS,
  TEMPLATES_FOLDER_NAME,
  WORKSPACE_SCHEMA_VERSION,
  projectFolderName,
} from "./layout.js";
export {
  gdriveFileIdFromTemplatePath,
  gdriveTemplatePath,
  GDRIVE_TEMPLATE_PREFIX,
  googleDocsEditUrl,
  googleDocsPreviewUrl,
  isGdriveTemplatePath,
} from "./templatePaths.js";
export { SheetsProjectRepository } from "./repositories/projects.js";
export { SheetsRunRepository } from "./repositories/runs.js";
export type {
  AccessTokenProvider,
  DocsApi,
  DocumentRefRow,
  DriveApi,
  DriveFile,
  GoogleApis,
  ProjectSummaryRow,
  RunRecordRow,
  SheetsApi,
  WorkspaceBinding,
} from "./types.js";
