import type { Bit, WorkspaceSnapshot, WorkspaceValue } from "@roborean/spec";

import type { BitExecutionResult } from "./bitExecutionTypes.js";

/**
 * Resolve a public literal workspace value for document rendering.
 *
 * @param workspace - Current workspace snapshot.
 * @param config - Bit config containing ``fromKey`` or ``value``.
 * @returns Cloned public literal workspace value.
 */
function resolvePublicLiteralValue(
  workspace: WorkspaceSnapshot,
  config: Record<string, unknown>,
): WorkspaceValue {
  if ("fromKey" in config && config.fromKey !== undefined) {
    const key = String(config.fromKey);
    const value = workspace.values[key];

    if (!value) {
      throw new Error(`Missing source variable: ${key}`);
    }

    if (value.kind !== "public_literal") {
      throw new Error(
        "secret_ref values cannot be rendered into document previews",
      );
    }

    return structuredClone(value);
  }

  const value = config.value as WorkspaceValue;

  if (!value || typeof value !== "object" || !("kind" in value)) {
    throw new Error("Invalid workspace value in bit config");
  }

  if (value.kind !== "public_literal") {
    throw new Error(
      "secret_ref values cannot be rendered into document previews",
    );
  }

  return structuredClone(value);
}

/**
 * Execute browser-safe document bits that emit previewable operations.
 *
 * @param bit - Bit definition to execute.
 * @param workspace - Current workspace snapshot.
 * @returns Workspace patch and emitted document operations.
 */
export function executeDocumentBit(
  bit: Bit,
  workspace: WorkspaceSnapshot,
): BitExecutionResult {
  if (bit.type === "roborean.replace_named_value") {
    const value = resolvePublicLiteralValue(workspace, bit.config);

    return {
      workspacePatch: { ops: [] },
      documentOps: [
        {
          documentId: String(bit.config.documentId),
          op: "replace_named_value",
          name: String(bit.config.name),
          value,
        },
      ],
    };
  }

  if (bit.type === "roborean.append_text") {
    const opName = String(bit.config.op ?? "plain.append_text");

    if (opName === "flow.insert_paragraph") {
      return {
        workspacePatch: { ops: [] },
        documentOps: [
          {
            documentId: String(bit.config.documentId),
            op: "flow.insert_paragraph",
            runs: [{ text: String(bit.config.text) }],
          },
        ],
      };
    }

    return {
      workspacePatch: { ops: [] },
      documentOps: [
        {
          documentId: String(bit.config.documentId),
          op: "plain.append_text",
          text: String(bit.config.text),
        },
      ],
    };
  }

  if (bit.type === "roborean.flow_append_paragraph") {
    const documentId = String(bit.config.documentId);
    const configuredOps = Array.isArray(bit.config.ops) ? bit.config.ops : [];

    return {
      workspacePatch: { ops: [] },
      documentOps: configuredOps.map((item) => ({
        documentId,
        ...(item as Record<string, unknown>),
      })),
    };
  }

  throw new Error(`Unknown document bit type: ${bit.type}`);
}

/** Browser-safe document bit type ids handled by ``executeDocumentBit``. */
export const documentBitTypeIds = new Set<string>([
  "roborean.replace_named_value",
  "roborean.append_text",
  "roborean.flow_append_paragraph",
]);
