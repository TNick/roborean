import { describe, expect, it } from "vitest";
import { applyMarkdownOps } from "../src/index.js";

describe("applyMarkdownOps", () => {
  it("renders headings and tables", () => {
    const body = applyMarkdownOps("# Report\n", [
      { documentId: "d", op: "flow.insert_heading", level: 2, text: "Summary" },
      {
        documentId: "d",
        op: "flow.replace_table_rows",
        table: "items",
        rows: [
          ["Item", "Qty"],
          ["A", "1"],
        ],
      },
    ]);
    expect(body).toContain("## Summary");
    expect(body).toContain("| A | 1 |");
  });
});
