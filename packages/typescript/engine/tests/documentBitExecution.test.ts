import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compileProject,
  executeBit,
  initialSnapshot,
  runProject,
} from "../src/index.js";

const root = resolve(import.meta.dirname, "../../../../");
const fixture = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));

describe("document bit execution", () => {
  it("emits replace_named_value from a workspace key", () => {
    const project = fixture(
      "conformance/documents/D01_text_hello/project.json",
    ) as Parameters<typeof initialSnapshot>[0];
    const workspace = initialSnapshot(project);
    const bit = project.bits[0]!;

    const result = executeBit(bit, workspace);

    expect(result.workspacePatch.ops).toEqual([]);
    expect(result.documentOps).toEqual([
      {
        documentId: "hello_doc",
        op: "replace_named_value",
        name: "name",
        value: {
          kind: "public_literal",
          dataType: "string",
          value: "Ada",
        },
      },
    ]);
  });

  it("runs text hello document bits in the browser runner", () => {
    const project = fixture(
      "conformance/documents/D01_text_hello/project.json",
    ) as Parameters<typeof compileProject>[0];
    const compiled = compileProject(project);
    const result = runProject(compiled, project as never, { runId: "test" });

    expect(result.status).toBe("success");
    expect(result.bitResults[0]?.documentOps).toEqual([
      {
        documentId: "hello_doc",
        op: "replace_named_value",
        name: "name",
        value: {
          kind: "public_literal",
          dataType: "string",
          value: "Ada",
        },
      },
    ]);
  });
});
