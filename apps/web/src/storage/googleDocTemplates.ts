import {
  ensureProjectFolder,
  ensureRoboreanFolder,
  ensureTemplatesFolder,
  gdriveTemplatePath,
  type GoogleApis,
  type WorkspaceBinding,
} from "@roborean/google-workspace";
import { pickDriveFile } from "./googlePicker.js";

/**
 * Host-provided Google Doc template actions for the project editor.
 */
export type GoogleDocTemplateHostActions = {
  /**
   * True when Google Doc template linking is available.
   */
  enabled: boolean;

  /**
   * Create a blank Google Doc under the project templates folder.
   *
   * @param documentId - Document definition id.
   * @param documentTitle - Human-readable document title.
   * @param existingTemplateIds - Template ids already used by the project.
   * @returns Registered template metadata.
   */
  createTemplate: (
    documentId: string,
    documentTitle: string,
    existingTemplateIds: string[],
  ) => Promise<{
    templateId: string;
    path: string;
    webViewLink?: string;
  }>;

  /**
   * Link an existing Google Doc selected via the Drive file picker.
   *
   * @param documentId - Document definition id.
   * @param existingTemplateIds - Template ids already used by the project.
   * @returns Registered template metadata.
   */
  linkTemplate: (
    documentId: string,
    existingTemplateIds: string[],
  ) => Promise<{
    templateId: string;
    path: string;
    webViewLink?: string;
  }>;
};

/**
 * Pick a unique template id for a document definition.
 *
 * @param documentId - Document definition id.
 * @param existing - Template ids already in use.
 * @returns Unused template id.
 */
function uniqueTemplateId(documentId: string, existing: string[]): string {
  let index = 1;
  while (existing.includes(`${documentId}_tpl_${index}`)) {
    index += 1;
  }
  return `${documentId}_tpl_${index}`;
}

/**
 * Build Google Doc template actions for the project editor.
 *
 * @param options - Google APIs, binding, and token provider.
 * @returns Host actions passed into ProjectEditor.
 */
export function createGoogleDocTemplateHostActions(options: {
  apis: GoogleApis;
  binding: WorkspaceBinding;
  getAccessToken: () => Promise<string>;
  projectId: string;
}): GoogleDocTemplateHostActions {
  /**
   * Ensure the project templates folder exists in Drive.
   *
   * @returns Templates folder metadata.
   */
  async function resolveTemplatesFolder() {
    const roborean = await ensureRoboreanFolder(
      options.apis.drive,
      options.binding.rootFolderId,
    );
    const projectFolder = await ensureProjectFolder(
      options.apis.drive,
      roborean.id,
      options.projectId,
    );
    return ensureTemplatesFolder(options.apis.drive, projectFolder.id);
  }

  return {
    enabled: true,
    async createTemplate(documentId, documentTitle, existingTemplateIds) {
      const templatesFolder = await resolveTemplatesFolder();
      const templateId = uniqueTemplateId(documentId, existingTemplateIds);
      const created = await options.apis.drive.createDocument(
        `${documentTitle || documentId} template`,
        templatesFolder.id,
      );
      return {
        templateId,
        path: gdriveTemplatePath(created.id),
        webViewLink: created.webViewLink,
      };
    },
    async linkTemplate(documentId, existingTemplateIds) {
      const picked = await pickDriveFile(options.getAccessToken);
      return {
        templateId: uniqueTemplateId(documentId, existingTemplateIds),
        path: gdriveTemplatePath(picked.id),
        webViewLink: picked.webViewLink,
      };
    },
  };
}
