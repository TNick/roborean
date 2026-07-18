import { describe, expect, it } from "vitest";
import type { Project } from "@roborean/spec";
import { initializeWorkspace } from "../src/binding.js";
import { ConflictError, NotFoundError } from "../src/errors.js";
import { createMemoryGoogleApis } from "../src/fake/memoryApis.js";
import { SheetsProjectRepository } from "../src/repositories/projects.js";
import { SheetsRunRepository } from "../src/repositories/runs.js";

/**
 * Build a minimal project document.
 *
 * @param id - Project id.
 * @returns Project document.
 */
function blankProject(id: string): Project {
  return {
    schemaVersion: "1.0.0",
    id,
    name: "Demo",
    pluginRequirements: [],
    workspace: { variables: [] },
    bits: [],
    documents: [],
    templates: [],
    metadata: {},
  };
}

describe("sheet repositories", () => {
  it("saves revisions and enforces optimistic concurrency", async () => {
    const apis = createMemoryGoogleApis();
    const binding = await initializeWorkspace(apis, "root", "Root");
    const projects = new SheetsProjectRepository(apis, binding, "owner-a");

    const first = await projects.save(blankProject("p1"));
    expect(first.revision).toBe("1");

    await expect(projects.save(blankProject("p1"), 99)).rejects.toBeInstanceOf(
      ConflictError,
    );

    const second = await projects.save(blankProject("p1"), first.rowVersion);
    expect(second.revision).toBe("2");
    expect((await projects.getRevision("p1", "1")).id).toBe("p1");
  });

  it("enforces idempotency digests for runs", async () => {
    const apis = createMemoryGoogleApis();
    const binding = await initializeWorkspace(apis, "root", "Root");
    const runs = new SheetsRunRepository(apis, binding, "owner-a");

    const created = await runs.create({
      projectId: "p1",
      idempotencyKey: "k1",
      requestBody: { dryRun: true },
      status: "success",
      payload: { results: { ok: true } },
    });
    expect(created.runId).toBeTruthy();

    await expect(
      runs.create({
        projectId: "p1",
        idempotencyKey: "k1",
        requestBody: { dryRun: false },
        status: "success",
        payload: {},
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(runs.get("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
