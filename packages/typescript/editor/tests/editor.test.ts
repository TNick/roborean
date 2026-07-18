import { describe, expect, it } from "vitest";
import type { Project } from "@roborean/spec";
import { uniqueEntityId } from "../src/entityDefaults.js";
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

describe("entityDefaults", () => {
  it("allocates unique ids", () => {
    expect(uniqueEntityId("variable", ["variable_1"])).toBe("variable_2");
  });
});

describe("editor store", () => {
  it("recomputes local diagnostics", () => {
    const store = createEditorStore(project);
    store.recomputeLocal();
    expect(store.getState().diagnostics).toBeDefined();
  });

  it("adds and removes a workspace variable", () => {
    const store = createEditorStore(project);
    store.addVariable();
    const afterAdd = store.getState();
    expect(afterAdd.project.workspace.variables).toHaveLength(1);
    expect(afterAdd.selectedVariableKey).toBe("variable_1");
    expect(afterAdd.focus).toBe("variable");
    store.removeVariable("variable_1");
    expect(store.getState().project.workspace.variables).toHaveLength(0);
    expect(store.getState().selectedVariableKey).toBeNull();
  });

  it("adds and removes a bit", () => {
    const store = createEditorStore(project);
    store.addBit("roborean.noop");
    const added = store.getState();
    expect(added.project.bits).toHaveLength(1);
    expect(added.project.bits[0]?.type).toBe("roborean.noop");
    expect(added.focus).toBe("bit");
    const bitId = added.project.bits[0]?.id ?? "";
    store.removeBit(bitId);
    expect(store.getState().project.bits).toHaveLength(0);
  });

  it("adds and removes a document with a template stub", () => {
    const store = createEditorStore(project);
    store.addDocument();
    const added = store.getState();
    expect(added.project.documents).toHaveLength(1);
    expect(added.project.documents[0]?.title).toBe("Document 1");
    expect(added.project.templates).toHaveLength(1);
    expect(added.focus).toBe("document");
    const docId = added.project.documents[0]?.id ?? "";
    store.removeDocument(docId);
    const removed = store.getState();
    expect(removed.project.documents).toHaveLength(0);
    expect(removed.project.templates).toHaveLength(0);
  });

  it("renames a variable key in selection state", () => {
    const store = createEditorStore(project);
    store.addVariable();
    const variable = store.getState().project.workspace.variables[0];
    if (!variable) {
      throw new Error("expected variable");
    }
    store.updateVariable(variable.key, { ...variable, key: "title" });
    expect(store.getState().selectedVariableKey).toBe("title");
  });
});
