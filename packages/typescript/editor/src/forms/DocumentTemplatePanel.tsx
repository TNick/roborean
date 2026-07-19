import { useRef, useState, type ChangeEvent } from "react";
import type { DocumentDefinition, Project } from "@roborean/spec";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import { Button, FormTextField, Stack, Typography } from "@roborean/ui";

import { uniqueEntityId } from "../entityDefaults.js";
import { documentHasLocalTemplate } from "../utils/documentDisplayTitle.js";
import {
  forkDocumentTemplate,
  gcUnusedTemplates,
  revertDocumentTemplate,
  templatePathForDocument,
} from "../utils/documentTemplateCow.js";

/**
 * Google Docs driver id used for native Drive-backed templates.
 */
const GOOGLE_DOCS_DRIVER_ID = "roborean.google.docs";

/**
 * Prefix for Google Drive template paths stored in project.templates[].path.
 */
const GDRIVE_TEMPLATE_PREFIX = "gdrive:";

/**
 * Host-provided Google Doc template actions.
 */
export type GoogleDocTemplateHostActions = {
  /** True when Google Doc template linking is available. */
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
 * Props for the document template editor panel.
 */
export type DocumentTemplatePanelProps = {
  /** Project owning the templates table. */
  project: Project;

  /** Document whose template is being edited. */
  document: DocumentDefinition;

  /** Stored project id for template API calls, when available. */
  projectId?: string;

  /**
   * Called when the document definition changes.
   *
   * @param next - Updated document definition.
   */
  onDocumentChange: (next: DocumentDefinition) => void;

  /**
   * Called when the project changes (templates table or fork metadata).
   *
   * @param next - Updated project.
   */
  onProjectChange: (next: Project) => void;

  /**
   * Read template body text for a template id.
   *
   * @param templateId - Template identifier.
   * @returns Template text or empty string when unknown.
   */
  getTemplateText: (templateId: string) => string;

  /**
   * Persist template body text after a copy-on-write fork or edit.
   *
   * @param templateId - Template identifier.
   * @param text - Updated template body.
   * @returns Promise that settles when content is stored locally.
   */
  setTemplateText: (templateId: string, text: string) => Promise<void>;

  /**
   * Upload binary template bytes after a copy-on-write fork.
   *
   * @param templateId - Template identifier.
   * @param bytes - Raw template file bytes.
   * @returns Promise that settles when content is stored locally.
   */
  setTemplateBytes: (templateId: string, bytes: ArrayBuffer) => Promise<void>;

  /**
   * Drop the local fork and restore the shared template reference.
   */
  onTemplateDelete?: (templateId: string) => void;

  /** Optional Google Doc template actions from the host app. */
  googleDocTemplate?: GoogleDocTemplateHostActions;
};

/**
 * Whether the document driver supports inline text template editing.
 *
 * @param document - Document definition.
 * @returns True for text and markdown drivers.
 */
function supportsTextTemplateEditor(document: DocumentDefinition): boolean {
  return document.type === "text" || document.type === "markdown";
}

/**
 * Extract a Drive file id from a gdrive: template path.
 *
 * @param path - Template path from project.templates[].
 * @returns Drive file id or null.
 */
function gdriveFileIdFromPath(path: string | undefined): string | null {
  if (!path || !path.startsWith(GDRIVE_TEMPLATE_PREFIX)) {
    return null;
  }
  const fileId = path.slice(GDRIVE_TEMPLATE_PREFIX.length);
  return fileId || null;
}

/**
 * Build an openable Google Docs edit URL for a Drive file id.
 *
 * @param fileId - Google Drive file id.
 * @returns Docs edit URL.
 */
function googleDocsEditUrl(fileId: string): string {
  return `https://docs.google.com/document/d/${fileId}/edit`;
}

/**
 * Template status, copy-on-write editor, and revert controls for one document.
 *
 * @param props - Panel inputs and handlers.
 * @returns Template panel UI.
 */
export function DocumentTemplatePanel({
  project,
  document,
  onDocumentChange,
  onProjectChange,
  getTemplateText,
  setTemplateText,
  setTemplateBytes,
  onTemplateDelete,
  googleDocTemplate,
}: DocumentTemplatePanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingGoogleTemplate, setPendingGoogleTemplate] = useState<{
    templateId: string;
    path: string;
    webViewLink?: string;
  } | null>(null);

  const templateRef =
    typeof document.templateRef === "string" ? document.templateRef : "";
  const templateEntry = project.templates.find(
    (entry) => entry.id === templateRef,
  );
  const localCopy = documentHasLocalTemplate(document);
  const textEditable = supportsTextTemplateEditor(document);
  const templateText = templateRef ? getTemplateText(templateRef) : "";
  const googleTemplateEnabled = Boolean(googleDocTemplate?.enabled);
  const linkedGdriveFileId = gdriveFileIdFromPath(templateEntry?.path);

  /**
   * Register a Google Doc template on the project and document.
   *
   * @param templateId - Template identifier.
   * @param path - gdrive: template path.
   */
  function registerGoogleTemplate(templateId: string, path: string): void {
    const templates = project.templates.filter(
      (entry) => entry.id !== templateId,
    );
    templates.push({ id: templateId, path });
    onProjectChange({ ...project, templates });
    onDocumentChange({
      ...document,
      type: "docx",
      driver: GOOGLE_DOCS_DRIVER_ID,
      templateRef: templateId,
    });
    setPendingGoogleTemplate(null);
  }

  /**
   * Ensure the document points at a fork before mutating template bytes.
   *
   * @returns Updated project and document after any fork.
   */
  async function ensureForkedTemplate(): Promise<{
    project: Project;
    document: DocumentDefinition;
    templateId: string;
  }> {
    if (localCopy) {
      return { project, document, templateId: templateRef };
    }

    const forkId = uniqueEntityId(
      `${document.id}_local`,
      project.templates.map((entry) => entry.id),
    );
    const sourceText = templateRef ? getTemplateText(templateRef) : "";
    const forked = forkDocumentTemplate(
      project,
      document,
      forkId,
      templatePathForDocument(document, forkId),
    );
    await setTemplateText(forkId, sourceText);
    return {
      project: forked.project,
      document: forked.document,
      templateId: forkId,
    };
  }

  /**
   * Apply an updated text template body with copy-on-write semantics.
   *
   * @param nextText - Updated template source text.
   * @returns Promise that settles when the edit is applied.
   */
  async function applyTextEdit(nextText: string): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      const forked = await ensureForkedTemplate();
      await setTemplateText(forked.templateId, nextText);
      onProjectChange(forked.project);
      onDocumentChange(forked.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Template edit failed");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Handle binary template upload for non-text drivers.
   *
   * @param event - File input change event.
   * @returns Promise that settles when upload is applied.
   */
  async function handleBinaryUpload(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const bytes = await file.arrayBuffer();
      const forkId = uniqueEntityId(
        `${document.id}_local`,
        project.templates.map((entry) => entry.id),
      );
      const forked = forkDocumentTemplate(
        project,
        document,
        forkId,
        templatePathForDocument(document, forkId, file.name),
      );
      await setTemplateBytes(forkId, bytes);
      onProjectChange(forked.project);
      onDocumentChange(forked.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Template upload failed");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Drop the local fork and restore the shared template reference.
   */
  function handleRevert(): void {
    const forkRef =
      typeof document.templateRef === "string" ? document.templateRef : "";
    const reverted = revertDocumentTemplate(project, document);
    onProjectChange({
      ...reverted.project,
      templates: gcUnusedTemplates(reverted.project),
    });
    onDocumentChange(reverted.document);
    if (forkRef) {
      onTemplateDelete?.(forkRef);
    }
  }

  /**
   * Create a blank Google Doc template in Drive and open it for editing.
   */
  async function handleCreateGoogleTemplate(): Promise<void> {
    if (!googleDocTemplate?.enabled) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const created = await googleDocTemplate.createTemplate(
        document.id,
        stringField(document, "title") || document.id,
        project.templates.map((entry) => entry.id),
      );
      setPendingGoogleTemplate(created);
      if (created.webViewLink) {
        window.open(created.webViewLink, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create Google Doc",
      );
    } finally {
      setBusy(false);
    }
  }

  /**
   * Link an existing Google Doc selected via the Drive file picker.
   */
  async function handleLinkGoogleTemplate(): Promise<void> {
    if (!googleDocTemplate?.enabled) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const linked = await googleDocTemplate.linkTemplate(
        document.id,
        project.templates.map((entry) => entry.id),
      );
      registerGoogleTemplate(linked.templateId, linked.path);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to link Google Doc",
      );
    } finally {
      setBusy(false);
    }
  }

  /** Remove the current Google Doc reference without deleting the Drive file. */
  function handleUnlinkGoogleTemplate(): void {
    if (!templateRef) {
      return;
    }
    onProjectChange({
      ...project,
      templates: project.templates.filter((entry) => entry.id !== templateRef),
    });
    onDocumentChange({ ...document, templateRef: undefined });
  }

  /**
   * Confirm a pending Google Doc as the linked template.
   */
  function handleConfirmPendingGoogleTemplate(): void {
    if (!pendingGoogleTemplate) {
      return;
    }
    registerGoogleTemplate(
      pendingGoogleTemplate.templateId,
      pendingGoogleTemplate.path,
    );
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Template
        </Typography>
        {localCopy ? (
          <Chip size="small" color="warning" label="Edited (local copy)" />
        ) : null}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {templateEntry?.path ?? "No template file linked"}
      </Typography>
      {googleTemplateEnabled ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => void handleCreateGoogleTemplate()}
          >
            Create Google Doc template
          </Button>
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => void handleLinkGoogleTemplate()}
          >
            {linkedGdriveFileId
              ? "Change linked Google Doc"
              : "Link existing Google Doc"}
          </Button>
          {pendingGoogleTemplate ? (
            <Button
              variant="contained"
              disabled={busy}
              onClick={handleConfirmPendingGoogleTemplate}
            >
              Use as template
            </Button>
          ) : null}
        </Stack>
      ) : null}
      {linkedGdriveFileId ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <Link
            href={googleDocsEditUrl(linkedGdriveFileId)}
            target="_blank"
            rel="noreferrer"
            variant="body2"
          >
            Open template in Google Docs
          </Link>
          <Button
            variant="text"
            color="inherit"
            disabled={busy}
            onClick={handleUnlinkGoogleTemplate}
          >
            Unlink
          </Button>
        </Stack>
      ) : null}
      {!linkedGdriveFileId && textEditable ? (
        <FormTextField
          size="small"
          label="Template body"
          value={templateText}
          multiline
          minRows={4}
          disabled={busy || !templateRef}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            void applyTextEdit(event.target.value)
          }
        />
      ) : !linkedGdriveFileId ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            Replace template file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(event) => void handleBinaryUpload(event)}
          />
        </Stack>
      ) : null}
      {localCopy ? (
        <Button
          variant="outlined"
          color="inherit"
          disabled={busy}
          onClick={handleRevert}
        >
          Revert to shared template
        </Button>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}

/**
 * Read a string field from a document definition.
 *
 * @param document - Document definition.
 * @param key - Field name.
 * @returns String value or empty string.
 */
function stringField(document: DocumentDefinition, key: string): string {
  const value = document[key];
  return typeof value === "string" ? value : "";
}
