import { describe, expect, it } from "vitest";
import type { Project } from "@roborean/spec";
import { createEditorStore } from "../src/state/editorStore.js";

const project: Project = {
  schemaVersion: "1.0.0",
  id: "p1",
  name: "P1",
  pluginRequirements: [],
  workspace: { variables: [] },
  bits: [],
  documents: [],
  templates: [],
  metadata: {},
};

describe("editor store", () => {
  it("recomputes local diagnostics", () => {
    const store = createEditorStore(project);
    store.recomputeLocal();
    expect(store.getState().diagnostics).toBeDefined();
  });
});
