import type { DocumentOperation } from "@roborean/documents-base";

type Node =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "table"; rows: string[][] };

export function applyMarkdownOps(prefix: string, ops: DocumentOperation[]): string {
  const nodes: Node[] = [];
  let templatePrefix = prefix;
  for (const op of ops) {
    if (op.op === "flow.insert_heading") {
      nodes.push({ kind: "heading", level: Number(op.level), text: String(op.text) });
    } else if (op.op === "flow.insert_paragraph") {
      const runs = (op.runs as Array<{ text: string }> | undefined) ?? [];
      nodes.push({ kind: "paragraph", text: runs.map((run) => run.text).join("") });
    } else if (op.op === "flow.replace_table_rows") {
      nodes.push({ kind: "table", rows: op.rows as string[][] });
    } else if (op.op === "replace_named_value") {
      const value = op.value as { value?: unknown } | undefined;
      templatePrefix = templatePrefix.replaceAll(
        `{{${String(op.name)}}}`,
        String(value?.value ?? ""),
      );
    }
  }
  const parts: string[] = [];
  if (templatePrefix) parts.push(templatePrefix.replace(/\n$/, ""));
  for (const node of nodes) {
    if (node.kind === "heading") parts.push(`${"#".repeat(node.level)} ${node.text}`);
    if (node.kind === "paragraph") parts.push(node.text);
    if (node.kind === "table") {
      const [header, ...rest] = node.rows;
      if (!header) continue;
      parts.push(`| ${header.join(" | ")} |`);
      parts.push(`| ${header.map(() => "---").join(" | ")} |`);
      for (const row of rest) parts.push(`| ${row.join(" | ")} |`);
    }
  }
  return `${parts.join("\n\n").replace(/\s+$/, "")}\n`;
}

export function previewMarkdown(prefix: string, ops: DocumentOperation[]): string {
  return applyMarkdownOps(prefix, ops);
}
