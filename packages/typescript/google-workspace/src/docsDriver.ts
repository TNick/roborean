import type {
  DocumentOperation,
  DriverManifest,
} from "@roborean/documents-base";
import { GoogleWorkspaceError } from "./errors.js";
import type { DocsApi } from "./types.js";

/**
 * Narrow browser-executable Google Docs driver capability set.
 */
export const GOOGLE_DOCS_DRIVER_MANIFEST: DriverManifest = {
  driverId: "roborean.google.docs",
  version: "0.1.0",
  irFamily: "flow",
  capabilities: [
    "plain.append_text",
    "plain.replace_all",
    "replace_named_value",
    "flow.append_paragraph",
    "flow.append_heading",
  ],
  supportsPreview: true,
  supportsBrowserExecution: true,
  supportsDiff: false,
  requiresBackend: false,
  templateMediaTypes: ["text/plain", "text/markdown"],
};

/**
 * How document ops are translated into Docs API requests.
 */
export type DocsRenderMode = "legacy" | "native";

/**
 * Options for translating document ops into Docs API requests.
 */
export type DocsRequestOptions = {
  /**
   * Optional starting template text for legacy blank-doc mode.
   */
  templateText?: string;

  /**
   * Legacy mode flattens ops into one insertText; native mode uses
   * replaceAllText and end-of-document inserts on a copied template.
   */
  renderMode?: DocsRenderMode;
};

/**
 * Translate supported document ops into Docs API batchUpdate requests.
 *
 * @param ops - Document operations emitted by bits.
 * @param options - Render mode and optional legacy template text.
 * @returns Docs API request objects.
 */
export function documentOpsToDocsRequests(
  ops: DocumentOperation[],
  options: DocsRequestOptions | string = "",
): Array<Record<string, unknown>> {
  const normalized: DocsRequestOptions =
    typeof options === "string" ? { templateText: options } : options;
  const renderMode = normalized.renderMode ?? "legacy";
  const templateText = normalized.templateText ?? "";

  // Reject unsupported ops before any write begins.
  for (const op of ops) {
    if (!GOOGLE_DOCS_DRIVER_MANIFEST.capabilities.includes(op.op)) {
      throw new GoogleWorkspaceError(
        `Unsupported Google Docs operation: ${op.op}`,
      );
    }
  }

  if (renderMode === "native") {
    return nativeTemplateRequests(ops);
  }

  return legacyBlankDocRequests(ops, templateText);
}

/**
 * Apply supported ops to a Google Doc.
 *
 * @param docs - Docs API client.
 * @param documentId - Target Google Doc id.
 * @param ops - Document operations.
 * @param options - Render mode and optional legacy template text.
 */
export async function applyOpsToGoogleDoc(
  docs: DocsApi,
  documentId: string,
  ops: DocumentOperation[],
  options: DocsRequestOptions | string = "",
): Promise<void> {
  const requests = documentOpsToDocsRequests(ops, options);
  if (requests.length === 0) {
    return;
  }
  await docs.batchUpdate(documentId, requests);
}

/**
 * Build replaceAllText and end-of-document insert requests for native mode.
 *
 * @param ops - Document operations emitted by bits.
 * @returns Docs API request objects.
 */
function nativeTemplateRequests(
  ops: DocumentOperation[],
): Array<Record<string, unknown>> {
  const requests: Array<Record<string, unknown>> = [];
  let appendText = "";

  for (const op of ops) {
    if (op.op === "replace_named_value") {
      requests.push(
        replaceAllTextRequest(`{{${String(op.name)}}}`, publicValue(op.value)),
      );
      continue;
    }
    if (op.op === "plain.replace_all") {
      requests.push(
        replaceAllTextRequest(String(op.find ?? ""), String(op.replace ?? "")),
      );
      continue;
    }
    if (op.op === "plain.append_text" || op.op === "flow.append_paragraph") {
      appendText += String(op.text ?? "");
      if (!appendText.endsWith("\n")) {
        appendText += "\n";
      }
      continue;
    }
    if (op.op === "flow.append_heading") {
      appendText += `${String(op.text ?? "")}\n`;
    }
  }

  if (appendText) {
    requests.push({
      insertText: {
        endOfSegmentLocation: { segmentId: "" },
        text: appendText,
      },
    });
  }

  return requests;
}

/**
 * Build a replaceAllText request for the Docs API.
 *
 * @param find - Needle text.
 * @param replace - Replacement text.
 * @returns Docs API request object.
 */
function replaceAllTextRequest(
  find: string,
  replace: string,
): Record<string, unknown> {
  return {
    replaceAllText: {
      containsText: {
        text: find,
        matchCase: true,
      },
      replaceText: replace,
    },
  };
}

/**
 * Flatten supported Google Docs ops into plain text for local preview.
 *
 * @param ops - Document operations emitted by bits.
 * @param templateText - Optional starting template text.
 * @returns Substituted plain-text body.
 */
export function applyOpsToPlainText(
  ops: DocumentOperation[],
  templateText = "",
): string {
  let body = templateText;
  for (const op of ops) {
    if (op.op === "replace_named_value") {
      body = body.replaceAll(`{{${String(op.name)}}}`, publicValue(op.value));
    } else if (
      op.op === "plain.append_text" ||
      op.op === "flow.append_paragraph"
    ) {
      body += String(op.text ?? "");
      if (!body.endsWith("\n")) {
        body += "\n";
      }
    } else if (op.op === "flow.append_heading") {
      body += `${String(op.text ?? "")}\n`;
    } else if (op.op === "plain.replace_all") {
      body = body.replaceAll(String(op.find ?? ""), String(op.replace ?? ""));
    }
  }
  return body;
}

/**
 * Wrap plain text as approximate HTML for preview display.
 *
 * @param text - Plain-text preview body.
 * @returns HTML string safe for dangerouslySetInnerHTML-free rendering.
 */
export function plainTextToPreviewHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div class="roborean-google-docs-preview"><pre>${escaped}</pre></div>`;
}

/**
 * Flatten ops into one insertText for blank-doc legacy mode.
 *
 * @param ops - Document operations emitted by bits.
 * @param templateText - Optional starting template text.
 * @returns Docs API request objects.
 */
function legacyBlankDocRequests(
  ops: DocumentOperation[],
  templateText: string,
): Array<Record<string, unknown>> {
  const body = applyOpsToPlainText(ops, templateText);
  if (!body) {
    return [];
  }

  return [
    {
      insertText: {
        location: { index: 1 },
        text: body,
      },
    },
  ];
}

/**
 * Extract a public string value from a workspace-style value object.
 *
 * @param value - Operation value payload.
 * @returns Display string.
 */
function publicValue(value: unknown): string {
  if (value && typeof value === "object" && "kind" in value) {
    const typed = value as { kind: string; value?: unknown };
    if (typed.kind === "public_literal") {
      return String(typed.value ?? "");
    }
  }
  return String(value ?? "");
}
