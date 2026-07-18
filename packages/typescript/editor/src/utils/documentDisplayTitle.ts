import type { DocumentDefinition } from "@roborean/spec";

/**
 * Human-facing label for a document definition in lists and pickers.
 *
 * @param document - Document definition.
 * @returns Title when set, otherwise the stable document id.
 */
export function documentDisplayTitle(document: DocumentDefinition): string {
  const title = typeof document.title === "string" ? document.title.trim() : "";
  if (title) {
    return title;
  }
  return document.id;
}

/**
 * Whether a document uses a forked local template copy.
 *
 * @param document - Document definition.
 * @returns True when `baseTemplateRef` is set.
 */
export function documentHasLocalTemplate(
  document: DocumentDefinition,
): boolean {
  return (
    typeof document.baseTemplateRef === "string" &&
    document.baseTemplateRef.length > 0
  );
}
