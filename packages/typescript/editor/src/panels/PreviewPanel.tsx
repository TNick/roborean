import { useEffect, useState } from "react";
import type { DocumentDefinition, Project } from "@roborean/spec";
import type { RunResults } from "@roborean/engine";
import type { DocumentOperation } from "@roborean/documents-base";
import type { createRoboreanClient } from "@roborean/api-types";
import {
  applyOpsToPlainText,
  isGdriveTemplatePath,
  plainTextToPreviewHtml,
} from "@roborean/google-workspace";
import { previewDocument } from "@roborean/documents-preview";
import CircularProgress from "@mui/material/CircularProgress";
import { Stack, Typography } from "@roborean/ui";

import {
  documentPreviewMode,
  documentRequiresBackendPreview,
  isGoogleDocsDriver,
} from "../utils/documentPreview.js";

/**
 * Props for the deterministic document preview panel.
 */
export type PreviewPanelProps = {
  /** Project containing document definitions. */
  project: Project;

  /** Selected document definition, if any. */
  document: DocumentDefinition | null;

  /** Latest local dry-run results used to collect document ops. */
  localRun: RunResults | null;

  /** Stored project id for server preview calls. */
  projectId?: string;

  /** API client for backend preview. */
  client?: Pick<ReturnType<typeof createRoboreanClient>, "previewDocument">;

  /**
   * Optional template body resolver for local preview.
   *
   * @param templateId - Template identifier.
   * @returns UTF-8 template text when known.
   */
  getTemplateText?: (templateId: string) => string;

  /**
   * Export plain text from a gdrive: template path for Google Docs preview.
   *
   * @param templatePath - gdrive:{fileId} template path.
   * @returns Exported template plain text.
   */
  resolveGdriveTemplateText?: (templatePath: string) => Promise<string>;
};

/**
 * Collect document operations emitted for one document id.
 *
 * @param localRun - Dry-run results from the editor store.
 * @param documentId - Target document id.
 * @returns Operations in emission order.
 */
function collectDocumentOps(
  localRun: RunResults | null,
  documentId: string,
): DocumentOperation[] {
  if (!localRun) {
    return [];
  }

  const ops: DocumentOperation[] = [];
  for (const bit of localRun.bitResults) {
    for (const raw of bit.documentOps) {
      const op = raw as DocumentOperation & { documentId?: string };
      if (op.documentId === documentId) {
        ops.push(op);
      }
    }
  }
  return ops;
}

/**
 * Resolve template placeholder text from the project template list.
 *
 * @param project - Project with template metadata.
 * @param document - Selected document definition.
 * @returns Template body hint when available.
 */
function templateHint(
  project: Project,
  document: DocumentDefinition,
  getTemplateText?: (templateId: string) => string,
): string | undefined {
  const templateRef = document.templateRef as string | undefined;
  if (!templateRef) {
    return undefined;
  }
  const cached = getTemplateText?.(templateRef);
  if (cached) {
    return cached;
  }
  const template = project.templates.find((item) => item.id === templateRef);
  if (!template) {
    return undefined;
  }
  if (document.type === "text" || document.type === "markdown") {
    return "";
  }
  return undefined;
}

/**
 * Renderer-owned preview for the selected document (text/markdown/HTML IR).
 *
 * @param props - Project, selection, dry-run output, and optional API client.
 * @returns Preview body or guidance when preview is unavailable.
 */
export function PreviewPanel({
  project,
  document,
  localRun,
  projectId,
  client,
  getTemplateText,
  resolveGdriveTemplateText,
}: PreviewPanelProps) {
  const [serverBody, setServerBody] = useState<string | null>(null);
  const [serverKind, setServerKind] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [googleBody, setGoogleBody] = useState<string | null>(null);
  const [googleMode, setGoogleMode] = useState<"text" | "html">("text");
  const [googleWarning, setGoogleWarning] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const needsBackend =
    document !== null &&
    documentRequiresBackendPreview(
      document as { type: string; driver?: string },
    );
  const usesGoogleDocs =
    document !== null && isGoogleDocsDriver(document as { driver?: string });

  useEffect(() => {
    if (!document || !needsBackend || !client || !projectId) {
      setServerBody(null);
      setServerKind(null);
      setServerError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setServerError(null);

    void client
      .previewDocument(projectId, { documentId: document.id })
      .then((response) => {
        if (cancelled) {
          return;
        }
        const body =
          typeof response.body === "string"
            ? response.body
            : JSON.stringify(response.body, null, 2);
        setServerBody(body);
        setServerKind(response.kind);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setServerError(
          err instanceof Error ? err.message : "Server preview failed",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, document, needsBackend, projectId]);

  useEffect(() => {
    if (!document || !usesGoogleDocs) {
      setGoogleBody(null);
      setGoogleWarning(null);
      setGoogleError(null);
      return;
    }

    const selectedDocument = document;
    const ops = collectDocumentOps(localRun, selectedDocument.id);
    if (ops.length === 0) {
      setGoogleBody(null);
      setGoogleWarning(null);
      setGoogleError(null);
      return;
    }

    let cancelled = false;
    setGoogleLoading(true);
    setGoogleError(null);

    /**
     * Build a local Google Docs preview from dry-run ops.
     */
    async function loadGooglePreview(): Promise<void> {
      const templateRef = selectedDocument.templateRef as string | undefined;
      const templateEntry = project.templates.find(
        (item) => item.id === templateRef,
      );
      let templateText = "";
      let warning: string | null = null;

      if (templateEntry?.path && isGdriveTemplatePath(templateEntry.path)) {
        if (resolveGdriveTemplateText) {
          try {
            templateText = await resolveGdriveTemplateText(templateEntry.path);
          } catch (err) {
            warning =
              err instanceof Error
                ? `${err.message} Open the template in Google Docs and retry.`
                : "Could not export the Google Doc template.";
            templateText = "";
          }
        } else {
          warning =
            "Connect Google Drive to preview gdrive: templates with exported text.";
        }
      } else if (templateRef) {
        templateText =
          getTemplateText?.(templateRef) ??
          templateHint(project, selectedDocument, getTemplateText) ??
          "";
      }

      const plainBody = applyOpsToPlainText(ops, templateText);
      const mode = documentPreviewMode(selectedDocument);
      const body =
        mode === "html" ? plainTextToPreviewHtml(plainBody) : plainBody;
      const warnings: string[] = [];
      if (warning) {
        warnings.push(warning);
      }
      if (mode === "html") {
        warnings.push(
          "Approximate preview — open in Google Docs for native formatting.",
        );
      }

      if (cancelled) {
        return;
      }
      setGoogleBody(body);
      setGoogleMode(mode === "html" ? "html" : "text");
      setGoogleWarning(warnings.length > 0 ? warnings.join(" ") : null);
    }

    void loadGooglePreview()
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setGoogleError(
          err instanceof Error ? err.message : "Google Docs preview failed",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setGoogleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    document,
    getTemplateText,
    localRun,
    project,
    resolveGdriveTemplateText,
    usesGoogleDocs,
  ]);

  if (!document) {
    return (
      <Typography variant="body2">Select a document to preview.</Typography>
    );
  }

  if (needsBackend) {
    if (!client || !projectId) {
      return (
        <Typography variant="body2">
          Connect the editor to the API to preview {document.type} documents.
        </Typography>
      );
    }
    if (loading) {
      return <CircularProgress size={24} />;
    }
    if (serverError) {
      return (
        <Typography variant="body2" color="error">
          {serverError}
        </Typography>
      );
    }
    if (serverBody !== null) {
      return (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Server preview ({serverKind ?? "unknown"})
          </Typography>
          <Typography
            component="pre"
            variant="body2"
            sx={{ whiteSpace: "pre-wrap" }}
          >
            {serverBody}
          </Typography>
        </Stack>
      );
    }
  }

  if (usesGoogleDocs) {
    const ops = collectDocumentOps(localRun, document.id);
    if (ops.length === 0) {
      return (
        <Typography variant="body2">
          Run dry-run after adding document bits to preview.
        </Typography>
      );
    }
    if (googleLoading) {
      return <CircularProgress size={24} />;
    }
    if (googleError) {
      return (
        <Typography variant="body2" color="error">
          {googleError}
        </Typography>
      );
    }
    if (googleBody !== null) {
      const templateRef = document.templateRef as string | undefined;
      const template = project.templates.find(
        (item) => item.id === templateRef,
      );
      return (
        <Stack spacing={1} data-testid="preview-panel">
          <Typography variant="body2" color="text.secondary">
            Google Docs preview ({googleMode}) · template{" "}
            {template?.id ?? templateRef ?? "—"}
          </Typography>
          {googleMode === "html" ? (
            <Typography
              component="div"
              variant="body2"
              data-testid="preview-body"
              dangerouslySetInnerHTML={{ __html: googleBody }}
            />
          ) : (
            <Typography
              component="pre"
              variant="body2"
              data-testid="preview-body"
              sx={{ whiteSpace: "pre-wrap" }}
            >
              {googleBody}
            </Typography>
          )}
          {googleWarning ? (
            <Typography variant="caption" color="warning.main">
              {googleWarning}
            </Typography>
          ) : null}
        </Stack>
      );
    }
  }

  const ops = collectDocumentOps(localRun, document.id);
  if (ops.length === 0) {
    return (
      <Typography variant="body2">
        Run dry-run after adding document bits to preview.
      </Typography>
    );
  }

  const preview = previewDocument({
    definition: {
      ...document,
      driver: typeof document.driver === "string" ? document.driver : "",
    },
    ops,
    templateText: templateHint(project, document, getTemplateText),
  });

  const body =
    typeof preview.body === "string"
      ? preview.body
      : JSON.stringify(preview.body, null, 2);

  const templateRef = document.templateRef as string | undefined;
  const template = project.templates.find((item) => item.id === templateRef);

  return (
    <Stack spacing={1} data-testid="preview-panel">
      <Typography variant="body2" color="text.secondary">
        Preview ({preview.mode}) · template {template?.id ?? templateRef ?? "—"}
      </Typography>
      <Typography
        component="pre"
        variant="body2"
        data-testid="preview-body"
        sx={{ whiteSpace: "pre-wrap" }}
      >
        {body}
      </Typography>
      {preview.warnings.map((warning) => (
        <Typography key={warning} variant="caption" color="warning.main">
          {warning}
        </Typography>
      ))}
    </Stack>
  );
}
