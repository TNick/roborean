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
 * Translate supported document ops into Docs API batchUpdate requests.
 *
 * @param ops - Document operations emitted by bits.
 * @param templateText - Optional starting template text.
 * @returns Docs API request objects.
 */
export function documentOpsToDocsRequests(
  ops: DocumentOperation[],
  templateText = "",
): Array<Record<string, unknown>> {
  // Reject unsupported ops before any write begins.
  for (const op of ops) {
    if (!GOOGLE_DOCS_DRIVER_MANIFEST.capabilities.includes(op.op)) {
      throw new GoogleWorkspaceError(
        `Unsupported Google Docs operation: ${op.op}`,
      );
    }
  }

  // Materialize a plain-text body first, then insert once into the Doc.
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
      const text = String(op.text ?? "");
      body += `${text}\n`;
    } else if (op.op === "plain.replace_all") {
      body = body.replaceAll(String(op.find ?? ""), String(op.replace ?? ""));
    }
  }

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
 * Apply supported ops to a newly created Google Doc.
 *
 * @param docs - Docs API client.
 * @param documentId - Target Google Doc id.
 * @param ops - Document operations.
 * @param templateText - Optional template text.
 */
export async function applyOpsToGoogleDoc(
  docs: DocsApi,
  documentId: string,
  ops: DocumentOperation[],
  templateText = "",
): Promise<void> {
  const requests = documentOpsToDocsRequests(ops, templateText);
  if (requests.length === 0) {
    return;
  }
  await docs.batchUpdate(documentId, requests);
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
