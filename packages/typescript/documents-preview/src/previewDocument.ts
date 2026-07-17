import type { DocumentOperation, DocumentPreview } from "@roborean/documents-base";
import { applyMarkdownOps } from "@roborean/documents-markdown";
import { applyTextOps } from "@roborean/documents-text";

export type PreviewInput = {
  definition: { id: string; type: string; driver: string };
  ops: DocumentOperation[];
  templateText?: string;
};

export function previewDocument(input: PreviewInput): DocumentPreview {
  const generatedAt = new Date().toISOString();
  if (input.definition.type === "text" || input.definition.driver === "roborean.text") {
    const body = applyTextOps(input.templateText ?? "", input.ops);
    return {
      documentId: input.definition.id,
      mode: "text",
      body,
      warnings: [],
      generatedAt,
      renderer: { package: "@roborean/documents-text", version: "0.3.0" },
    };
  }
  if (
    input.definition.type === "markdown" ||
    input.definition.driver === "roborean.markdown"
  ) {
    const body = applyMarkdownOps(input.templateText ?? "", input.ops);
    return {
      documentId: input.definition.id,
      mode: "text",
      body,
      warnings: [],
      generatedAt,
      renderer: { package: "@roborean/documents-markdown", version: "0.3.0" },
    };
  }
  if (input.definition.type === "xlsx") {
    return {
      documentId: input.definition.id,
      mode: "html",
      body: buildSheetHtml(input.ops),
      warnings: ["Operation-stream HTML preview; final bytes from Python."],
      generatedAt,
      renderer: { package: "@roborean/documents-preview", version: "0.3.0" },
    };
  }
  if (input.definition.type === "docx") {
    return {
      documentId: input.definition.id,
      mode: "html",
      body: buildFlowHtml(input.ops),
      warnings: ["Operation-stream HTML preview; final bytes from Python."],
      generatedAt,
      renderer: { package: "@roborean/documents-preview", version: "0.3.0" },
    };
  }
  if (input.definition.type === "dxf" || input.definition.type === "image") {
    return {
      documentId: input.definition.id,
      mode: "drawing-json",
      body: { ops: input.ops },
      warnings: [],
      generatedAt,
      renderer: { package: "@roborean/documents-preview", version: "0.3.0" },
    };
  }
  throw new Error(`Unsupported preview type: ${input.definition.type}`);
}

function buildSheetHtml(ops: DocumentOperation[]): string {
  const cells: string[] = [];
  for (const op of ops) {
    if (op.op === "sheet.set_cell") {
      const value = op.value as { value?: unknown } | undefined;
      cells.push(`<tr><td>${String(op.cell)}</td><td>${String(value?.value ?? "")}</td></tr>`);
    }
  }
  return `<div class="roborean-xlsx"><table>${cells.join("")}</table></div>`;
}

function buildFlowHtml(ops: DocumentOperation[]): string {
  const parts = ['<div class="roborean-docx">'];
  for (const op of ops) {
    if (op.op === "flow.insert_heading") {
      parts.push(`<h${Number(op.level)}>${String(op.text)}</h${Number(op.level)}>`);
    } else if (op.op === "flow.insert_paragraph") {
      const runs = (op.runs as Array<{ text: string }> | undefined) ?? [];
      parts.push(`<p>${runs.map((run) => run.text).join("")}</p>`);
    }
  }
  parts.push("</div>");
  return parts.join("");
}
