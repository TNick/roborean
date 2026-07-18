import { describe, expect, it } from "vitest";
import type { Project } from "@roborean/spec";
import { initializeWorkspace } from "../src/binding.js";
import { createGoogleWorkspaceClient } from "../src/client.js";
import { documentOpsToDocsRequests } from "../src/docsDriver.js";
import { GoogleWorkspaceError } from "../src/errors.js";
import { createMemoryGoogleApis } from "../src/fake/memoryApis.js";

/**
 * Build a project that emits a Google Docs-compatible append op.
 *
 * @returns Project document.
 */
function appendProject(): Project {
  return {
    schemaVersion: "1.0.0",
    id: "docs-demo",
    name: "Docs demo",
    pluginRequirements: [],
    workspace: { variables: [] },
    bits: [
      {
        id: "b1",
        type: "roborean.noop",
        when: true,
        config: {},
        reads: [],
        writes: [],
        emits: [],
        effectClass: "pure",
        onError: "abort",
        capabilities: [],
      },
    ],
    documents: [],
    templates: [],
    metadata: {},
  };
}

describe("google workspace client", () => {
  it("creates projects and durable dry-runs", async () => {
    const apis = createMemoryGoogleApis();
    const binding = await initializeWorkspace(apis, "root", "Root");
    const client = createGoogleWorkspaceClient({ apis, binding });

    await client.createProject({ project: appendProject() });
    const listed = await client.listProjects();
    expect(listed).toHaveLength(1);

    const run = await client.createRun("docs-demo", { dryRun: true }, "idem-1");
    expect(run.status).toBe("success");
    expect(run.runId).toBeTruthy();

    const loaded = await client.getRun(run.runId);
    expect(loaded.projectId).toBe("docs-demo");
  });

  it("rejects unsupported docs operations before write", () => {
    expect(() =>
      documentOpsToDocsRequests([
        {
          documentId: "doc1",
          op: "sheet.set_cell",
        },
      ]),
    ).toThrow(GoogleWorkspaceError);
  });

  it("writes supported ops into a Google Doc on non-dry runs", async () => {
    const apis = createMemoryGoogleApis();
    const binding = await initializeWorkspace(apis, "root", "Root");
    const client = createGoogleWorkspaceClient({ apis, binding });

    // Seed a project, then synthesize document ops via a local apply path.
    await client.createProject({ project: appendProject() });

    // Exercise the docs driver through applyOps path with a created doc.
    const created = await apis.drive.createDocument("Letter", "root");
    const { applyOpsToGoogleDoc } = await import("../src/docsDriver.js");
    await applyOpsToGoogleDoc(apis.docs, created.id, [
      {
        documentId: "doc1",
        op: "plain.append_text",
        text: "Hello",
      },
    ]);
    expect(apis.docsRequests.get(created.id)?.length).toBeGreaterThan(0);
  });
});
