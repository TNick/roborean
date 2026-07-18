import type { DocumentDefinition, Project } from "@roborean/spec";

/**
 * Default template file extension for a document type.
 *
 * @param documentType - Document family.
 * @returns File extension including the leading dot.
 */
export function templateExtensionForType(documentType: string): string {
  switch (documentType) {
    case "markdown":
      return ".md";
    case "xlsx":
      return ".xlsx";
    case "docx":
      return ".docx";
    case "image":
      return ".png";
    case "dxf":
      return ".dxf";
    default:
      return ".txt";
  }
}

/**
 * Build a templates-table path for a document-local template id.
 *
 * @param document - Document definition.
 * @param templateId - Template identifier.
 * @param uploadedName - Optional uploaded filename for extension hints.
 * @returns Relative path under the project package root.
 */
export function templatePathForDocument(
  document: DocumentDefinition,
  templateId: string,
  uploadedName?: string,
): string {
  if (uploadedName?.includes(".")) {
    const suffix = uploadedName.slice(uploadedName.lastIndexOf("."));
    return `templates/${templateId}${suffix}`;
  }
  return `templates/${templateId}${templateExtensionForType(document.type)}`;
}

/**
 * Fork a document template into a stand-alone local copy.
 *
 * @param project - Current project document.
 * @param document - Document being edited.
 * @param forkTemplateId - New template id for the fork.
 * @param forkPath - Relative template file path for the fork.
 * @returns Updated project and document with fork metadata applied.
 */
export function forkDocumentTemplate(
  project: Project,
  document: DocumentDefinition,
  forkTemplateId: string,
  forkPath: string,
): { project: Project; document: DocumentDefinition } {
  const currentRef =
    typeof document.templateRef === "string" ? document.templateRef : "";
  const templates = [...project.templates];
  if (!templates.some((entry) => entry.id === forkTemplateId)) {
    templates.push({ id: forkTemplateId, path: forkPath });
  }

  const nextDocument: DocumentDefinition = {
    ...document,
    templateRef: forkTemplateId,
    baseTemplateRef:
      typeof document.baseTemplateRef === "string" &&
      document.baseTemplateRef.length > 0
        ? document.baseTemplateRef
        : currentRef,
  };

  return {
    project: { ...project, templates },
    document: nextDocument,
  };
}

/**
 * Restore a document to its shared template reference.
 *
 * @param project - Current project document.
 * @param document - Document with a local template fork.
 * @returns Updated project and document after revert metadata is applied.
 */
export function revertDocumentTemplate(
  project: Project,
  document: DocumentDefinition,
): { project: Project; document: DocumentDefinition } {
  const baseRef =
    typeof document.baseTemplateRef === "string"
      ? document.baseTemplateRef
      : "";
  const forkRef =
    typeof document.templateRef === "string" ? document.templateRef : "";
  const nextDocument: DocumentDefinition = {
    ...document,
    templateRef: baseRef || forkRef,
  };
  delete nextDocument.baseTemplateRef;

  let templates = project.templates;
  if (forkRef && forkRef !== baseRef) {
    const stillUsed = project.documents.some(
      (entry) =>
        entry.id !== document.id &&
        (entry.templateRef === forkRef || entry.baseTemplateRef === forkRef),
    );
    if (!stillUsed) {
      templates = templates.filter((entry) => entry.id !== forkRef);
    }
  }

  return {
    project: { ...project, templates },
    document: nextDocument,
  };
}

/**
 * Remove unused template table rows from a project document.
 *
 * @param project - Project whose template table should be trimmed.
 * @returns Project with orphaned template rows removed.
 */
export function gcUnusedTemplates(project: Project): Project["templates"] {
  const used = new Set<string>();
  for (const document of project.documents) {
    if (typeof document.templateRef === "string") {
      used.add(document.templateRef);
    }
    if (typeof document.baseTemplateRef === "string") {
      used.add(document.baseTemplateRef);
    }
  }
  return project.templates.filter((entry) => used.has(entry.id));
}
