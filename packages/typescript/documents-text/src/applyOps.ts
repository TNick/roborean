import type { DocumentOperation } from "@roborean/documents-base";

function publicValue(value: unknown): string {
  if (value && typeof value === "object" && "kind" in value) {
    const typed = value as { kind: string; value?: unknown };
    if (typed.kind === "public_literal") return String(typed.value ?? "");
  }
  return String(value ?? "");
}

/** Apply text/plain document ops to a template string. */
export function applyTextOps(template: string, ops: DocumentOperation[]): string {
  let body = template;
  for (const op of ops) {
    if (op.op === "replace_named_value") {
      body = body.replaceAll(`{{${String(op.name)}}}`, publicValue(op.value));
    } else if (op.op === "plain.append_text") {
      body += String(op.text ?? "");
    } else if (op.op === "plain.replace_all") {
      body = body.replaceAll(String(op.find ?? ""), String(op.replace ?? ""));
    }
  }
  if (!body.endsWith("\n")) body += "\n";
  return body;
}

export function previewText(template: string, ops: DocumentOperation[]): string {
  return applyTextOps(template, ops);
}
