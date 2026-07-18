import type { DocumentDefinition } from "@roborean/spec";

/**
 * Google Docs driver id used for native Drive-backed documents.
 */
export const GOOGLE_DOCS_DRIVER_ID = "roborean.google.docs";

/**
 * Document types that need the server preview endpoint (no browser driver).
 */
const BACKEND_PREVIEW_TYPES = new Set(["docx", "xlsx", "image", "dxf"]);

/**
 * Return true when the document uses the Google Docs browser driver.
 *
 * @param document - Document definition or driver/type fields.
 * @returns True for roborean.google.docs.
 */
export function isGoogleDocsDriver(document: { driver?: string }): boolean {
  return document.driver === GOOGLE_DOCS_DRIVER_ID;
}

/**
 * Whether preview for a document definition should use POST /preview.
 *
 * @param document - Document definition fields used for preview routing.
 * @returns True when the editor should call the API for preview.
 */
export function documentRequiresBackendPreview(document: {
  type: string;
  driver?: string;
}): boolean {
  if (isGoogleDocsDriver(document)) {
    return false;
  }
  return BACKEND_PREVIEW_TYPES.has(document.type);
}

/**
 * Read preview mode from a document definition.
 *
 * @param document - Document definition.
 * @returns Preview mode string, defaulting to text.
 */
export function documentPreviewMode(document: DocumentDefinition): string {
  const preview = document.preview;
  if (!preview || typeof preview !== "object") {
    return "text";
  }
  const record = preview as Record<string, unknown>;
  return typeof record.mode === "string" ? record.mode : "text";
}
