import { describe, expect, it } from "vitest";
import type { Project } from "@roborean/spec";
import { buildDependencyGraph } from "../src/dependencyGraph.js";
import { scrubProjectForEditor } from "../src/secretExposure.js";

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
});
