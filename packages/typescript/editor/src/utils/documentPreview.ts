/**
 * Document types that need the server preview endpoint (no browser driver).
 */
const BACKEND_PREVIEW_TYPES = new Set(["docx", "xlsx", "image", "dxf"]);

/**
 * Whether preview for a document definition should use POST /preview.
 *
 * @param documentType - Value of `DocumentDefinition.type`.
 * @returns True when the editor should call the API for preview.
 */
export function documentRequiresBackendPreview(documentType: string): boolean {
  return BACKEND_PREVIEW_TYPES.has(documentType);
}
