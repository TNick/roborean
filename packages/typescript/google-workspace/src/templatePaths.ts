/**
 * Prefix for Google Drive template paths stored in project.templates[].path.
 */
export const GDRIVE_TEMPLATE_PREFIX = "gdrive:";

/**
 * Return true when a template path refers to a Google Drive file.
 *
 * @param path - Template path from project.templates[].
 * @returns True when the path uses the gdrive: convention.
 */
export function isGdriveTemplatePath(path: string): boolean {
  return path.startsWith(GDRIVE_TEMPLATE_PREFIX);
}

/**
 * Extract a Drive file id from a gdrive: template path.
 *
 * @param path - Template path from project.templates[].
 * @returns Drive file id or null when the path is not gdrive-backed.
 */
export function gdriveFileIdFromTemplatePath(path: string): string | null {
  if (!isGdriveTemplatePath(path)) {
    return null;
  }
  const fileId = path.slice(GDRIVE_TEMPLATE_PREFIX.length);
  return fileId || null;
}

/**
 * Build a gdrive: template path for a Drive file id.
 *
 * @param fileId - Google Drive file id.
 * @returns Template path string.
 */
export function gdriveTemplatePath(fileId: string): string {
  return `${GDRIVE_TEMPLATE_PREFIX}${fileId}`;
}

/**
 * Build an openable Google Docs edit URL for a Drive file id.
 *
 * @param fileId - Google Drive file id.
 * @returns Docs edit URL.
 */
export function googleDocsEditUrl(fileId: string): string {
  return `https://docs.google.com/document/d/${fileId}/edit`;
}

/**
 * Build a read-only Google Docs preview URL for iframe embedding.
 *
 * @param fileId - Google Drive file id.
 * @returns Docs preview URL.
 */
export function googleDocsPreviewUrl(fileId: string): string {
  return `https://docs.google.com/document/d/${fileId}/preview`;
}
