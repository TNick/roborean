import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Project } from "@roborean/spec";
import { buildDependencyGraph } from "../src/dependencyGraph.js";
import { localDryRun } from "../src/dryRun.js";
import { scrubProjectForEditor } from "../src/secretExposure.js";

const root = resolve(import.meta.dirname, "../../../../");
const fixture = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));

const sample: Project = {
  schemaVersion: "1.0.0",
  id: "sample",
  name: "Sample",
  pluginRequirements: [],
  workspace: {
    variables: [
      {
        key: "title",
        schema: { type: "string" },
        defaultValue: {
          kind: "public_literal",
          dataType: "string",
          value: "Hi",
        },
        exposure: "clientVisible",
      },
    ],
  },
  bits: [
    {
      id: "b1",
      type: "roborean.set_variable",
      when: true,
      config: {
        key: "title",
        value: { kind: "public_literal", dataType: "string", value: "World" },
      },
      reads: [],
      writes: ["title"],
      emits: [],
      effectClass: "workspace",
      onError: "abort",
      capabilities: [],
    },
  ],
  documents: [],
  templates: [],
  metadata: {},
};

describe("validation", () => {
  it("builds dependency edges", () => {
    const graph = buildDependencyGraph(sample);
    expect(graph.edges.some((edge) => edge.reason === "write")).toBe(true);
  });

  it("scrubs backend-only values", () => {
    const scrubbed = scrubProjectForEditor({
      ...sample,
      workspace: {
        variables: [
          {
            key: "token",
            schema: { type: "string" },
            defaultValue: { kind: "secret_ref", ref: "sec:env:TOKEN" },
            exposure: "backendOnly",
          },
        ],
      },
    });
    expect(scrubbed.workspace.variables[0]?.defaultValue.kind).toBe("redacted");
  });

  it("dry-runs browser-safe text document bits", () => {
    const project = fixture(
      "conformance/documents/D01_text_hello/project.json",
    ) as Project;
    const outcome = localDryRun(project);

    expect(outcome.diagnostics.some((item) => item.severity === "error")).toBe(
      false,
    );
    expect(
      outcome.diagnostics.some(
        (item) => item.code === "W_BACKEND_ONLY_SKIPPED",
      ),
    ).toBe(false);
    expect(outcome.results?.status).toBe("success");
    expect(outcome.results?.bitResults[0]?.documentOps).toEqual([
      expect.objectContaining({
        op: "replace_named_value",
        documentId: "hello_doc",
        name: "name",
      }),
    ]);
  });
});
