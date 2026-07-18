import {
  projectFolderName,
  ROBOREAN_FOLDER_NAME,
  TEMPLATES_FOLDER_NAME,
} from "./layout.js";
import type { DriveApi, DriveFile } from "./types.js";

/**
 * Find or create the Roborean marker folder under a user root.
 *
 * @param drive - Drive API client.
 * @param rootFolderId - User-selected root folder id.
 * @returns Roborean folder metadata.
 */
export async function ensureRoboreanFolder(
  drive: DriveApi,
  rootFolderId: string,
): Promise<DriveFile> {
  const existing = await drive.findChild(
    rootFolderId,
    ROBOREAN_FOLDER_NAME,
    "application/vnd.google-apps.folder",
  );
  if (existing) {
    return existing;
  }
  return drive.createFolder(ROBOREAN_FOLDER_NAME, rootFolderId);
}

/**
 * Find or create a project folder under Roborean/.
 *
 * @param drive - Drive API client.
 * @param roboreanFolderId - Roborean folder id.
 * @param projectId - Project identifier.
 * @returns Project folder metadata.
 */
export async function ensureProjectFolder(
  drive: DriveApi,
  roboreanFolderId: string,
  projectId: string,
): Promise<DriveFile> {
  const folderName = projectFolderName(projectId);
  const existing = await drive.findChild(
    roboreanFolderId,
    folderName,
    "application/vnd.google-apps.folder",
  );
  if (existing) {
    return existing;
  }
  return drive.createFolder(folderName, roboreanFolderId);
}

/**
 * Find or create the templates sub-folder for a project.
 *
 * @param drive - Drive API client.
 * @param projectFolderId - Project folder id.
 * @returns Templates folder metadata.
 */
export async function ensureTemplatesFolder(
  drive: DriveApi,
  projectFolderId: string,
): Promise<DriveFile> {
  const existing = await drive.findChild(
    projectFolderId,
    TEMPLATES_FOLDER_NAME,
    "application/vnd.google-apps.folder",
  );
  if (existing) {
    return existing;
  }
  return drive.createFolder(TEMPLATES_FOLDER_NAME, projectFolderId);
}
