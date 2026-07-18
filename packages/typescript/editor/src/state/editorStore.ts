import type {
  Bit,
  DocumentDefinition,
  Project,
  Variable,
} from "@roborean/spec";
import type { RunDetail } from "@roborean/api-types";
import type { CompiledProject, RunResults } from "@roborean/engine";
import {
  buildDependencyGraph,
  diagnoseProject,
  localDryRun,
  type DependencyEdge,
  type DependencyNode,
  type EditorDiagnostic,
} from "@roborean/validation";

import {
  defaultBit,
  defaultDocument,
  defaultVariable,
  uniqueEntityId,
} from "../entityDefaults.js";
import { gcUnusedTemplates } from "../utils/documentTemplateCow.js";

export type TemplateContentEntry = {
  /** UTF-8 text body when the template is text-like. */
  text?: string;

  /** Raw bytes for binary templates. */
  bytes?: ArrayBuffer;
};

export type EditorFocus = "bit" | "variable" | "document";

export type EditorState = {
  project: Project;
  compiled: CompiledProject | null;
  localRun: RunResults | null;
  serverRun: RunDetail | null;
  diagnostics: EditorDiagnostic[];
  selectedBitId: string | null;
  selectedVariableKey: string | null;
  selectedDocumentId: string | null;
  focus: EditorFocus;
  graph: { nodes: DependencyNode[]; edges: DependencyEdge[] } | null;
  dirty: boolean;
  templateContent: Record<string, TemplateContentEntry>;
  pendingTemplateDeletes: string[];
  dirtyTemplateIds: string[];
};

export type EditorStore = {
  getState: () => EditorState;
  subscribe: (listener: () => void) => () => void;
  replaceProject: (project: Project) => void;
  selectBit: (bitId: string | null) => void;
  selectVariable: (key: string | null) => void;
  selectDocument: (documentId: string | null) => void;
  reorderBit: (bitId: string, direction: -1 | 1) => void;
  moveBitToIndex: (bitId: string, targetIndex: number) => void;
  addVariable: () => void;
  removeVariable: (key: string) => void;
  addBit: (typeId: string) => void;
  removeBit: (bitId: string) => void;
  addDocument: () => void;
  removeDocument: (documentId: string) => void;
  updateBit: (bitId: string, next: Bit) => void;
  updateVariable: (key: string, next: Variable) => void;
  updateDocument: (documentId: string, next: DocumentDefinition) => void;
  replaceProjectDocument: (project: Project) => void;
  getTemplateText: (templateId: string) => string;
  setTemplateText: (templateId: string, text: string) => Promise<void>;
  setTemplateBytes: (templateId: string, bytes: ArrayBuffer) => Promise<void>;
  hydrateTemplateContent: (
    entries: Record<string, TemplateContentEntry>,
  ) => void;
  pendingTemplateSync: () => {
    upserts: Record<string, TemplateContentEntry>;
    deletes: string[];
  };
  clearPendingTemplateSync: () => void;
  markTemplateDeleted: (templateId: string) => void;
  recomputeLocal: () => void;
  setServerRun: (run: RunDetail | null) => void;
  markSaved: () => void;
};

/** Minimal editor store without external state libraries. */
export function createEditorStore(initial: Project): EditorStore {
  let state: EditorState = {
    project: initial,
    compiled: null,
    localRun: null,
    serverRun: null,
    diagnostics: [],
    selectedBitId: initial.bits[0]?.id ?? null,
    selectedVariableKey: initial.workspace.variables[0]?.key ?? null,
    selectedDocumentId: initial.documents[0]?.id ?? null,
    focus: "bit",
    graph: buildDependencyGraph(initial),
    dirty: false,
    templateContent: {},
    pendingTemplateDeletes: [],
    dirtyTemplateIds: [],
  };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const setProject = (
    project: Project,
    patch: Partial<Omit<EditorState, "project" | "graph" | "dirty">> = {},
  ) => {
    state = {
      ...state,
      ...patch,
      project,
      dirty: true,
      graph: buildDependencyGraph(project),
    };
    notify();
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replaceProject: (project) => {
      state = {
        ...state,
        project,
        dirty: true,
        graph: buildDependencyGraph(project),
      };
      notify();
    },
    selectBit: (bitId) => {
      state = { ...state, selectedBitId: bitId, focus: "bit" };
      notify();
    },
    selectVariable: (key) => {
      state = { ...state, selectedVariableKey: key, focus: "variable" };
      notify();
    },
    selectDocument: (documentId) => {
      state = {
        ...state,
        selectedDocumentId: documentId,
        focus: "document",
      };
      notify();
    },
    reorderBit: (bitId, direction) => {
      const index = state.project.bits.findIndex((bit) => bit.id === bitId);
      if (index < 0) {
        return;
      }
      const target = index + direction;
      if (target < 0 || target >= state.project.bits.length) {
        return;
      }
      const bits = [...state.project.bits];
      const [item] = bits.splice(index, 1);
      bits.splice(target, 0, item);
      setProject({ ...state.project, bits });
    },
    moveBitToIndex: (bitId, targetIndex) => {
      const index = state.project.bits.findIndex((bit) => bit.id === bitId);
      if (index < 0) {
        return;
      }
      if (targetIndex < 0 || targetIndex >= state.project.bits.length) {
        return;
      }
      if (index === targetIndex) {
        return;
      }
      const bits = [...state.project.bits];
      const [item] = bits.splice(index, 1);
      bits.splice(targetIndex, 0, item);
      setProject({ ...state.project, bits });
    },
    addVariable: () => {
      const key = uniqueEntityId(
        "variable",
        state.project.workspace.variables.map((variable) => variable.key),
      );
      const variables = [
        ...state.project.workspace.variables,
        defaultVariable(key),
      ];
      setProject(
        {
          ...state.project,
          workspace: { variables },
        },
        { selectedVariableKey: key, focus: "variable" },
      );
    },
    removeVariable: (key) => {
      const variables = state.project.workspace.variables.filter(
        (variable) => variable.key !== key,
      );
      const selectedVariableKey =
        state.selectedVariableKey === key
          ? (variables[0]?.key ?? null)
          : state.selectedVariableKey;
      setProject(
        {
          ...state.project,
          workspace: { variables },
        },
        { selectedVariableKey },
      );
    },
    addBit: (typeId) => {
      const id = uniqueEntityId(
        "bit",
        state.project.bits.map((bit) => bit.id),
      );
      const bits = [
        ...state.project.bits,
        defaultBit(id, typeId, state.project),
      ];
      setProject(
        { ...state.project, bits },
        { selectedBitId: id, focus: "bit" },
      );
    },
    removeBit: (bitId) => {
      const bits = state.project.bits.filter((bit) => bit.id !== bitId);
      const selectedBitId =
        state.selectedBitId === bitId
          ? (bits[0]?.id ?? null)
          : state.selectedBitId;
      setProject({ ...state.project, bits }, { selectedBitId });
    },
    addDocument: () => {
      const id = uniqueEntityId(
        "doc",
        state.project.documents.map((document) => document.id),
      );
      const { document, template } = defaultDocument(id);
      const templates = [...state.project.templates];
      if (!templates.some((entry) => entry.id === template.id)) {
        templates.push(template);
      }
      const documents = [...state.project.documents, document];
      const templateContent = {
        ...state.templateContent,
        [template.id]: { text: "" },
      };
      setProject(
        { ...state.project, documents, templates },
        {
          selectedDocumentId: id,
          focus: "document",
          templateContent,
          dirtyTemplateIds: [...state.dirtyTemplateIds, template.id],
        },
      );
    },
    removeDocument: (documentId) => {
      const documents = state.project.documents.filter(
        (document) => document.id !== documentId,
      );
      const templates = gcUnusedTemplates({
        ...state.project,
        documents,
      });
      const selectedDocumentId =
        state.selectedDocumentId === documentId
          ? (documents[0]?.id ?? null)
          : state.selectedDocumentId;
      setProject(
        { ...state.project, documents, templates },
        { selectedDocumentId },
      );
    },
    updateBit: (bitId, next) => {
      const bits = state.project.bits.map((bit) =>
        bit.id === bitId ? next : bit,
      );
      const selectedBitId = bitId !== next.id ? next.id : state.selectedBitId;
      setProject({ ...state.project, bits }, { selectedBitId });
    },
    updateVariable: (key, next) => {
      const variables = state.project.workspace.variables.map((variable) =>
        variable.key === key ? next : variable,
      );
      const selectedVariableKey =
        key !== next.key ? next.key : state.selectedVariableKey;
      setProject(
        {
          ...state.project,
          workspace: { variables },
        },
        { selectedVariableKey },
      );
    },
    updateDocument: (documentId, next) => {
      const documents = state.project.documents.map((document) =>
        document.id === documentId ? next : document,
      );
      const selectedDocumentId =
        documentId !== next.id ? next.id : state.selectedDocumentId;
      setProject({ ...state.project, documents }, { selectedDocumentId });
    },
    replaceProjectDocument: (project) => {
      setProject({ ...project, templates: gcUnusedTemplates(project) });
    },
    getTemplateText: (templateId) => {
      const entry = state.templateContent[templateId];
      return entry?.text ?? "";
    },
    setTemplateText: async (templateId, text) => {
      state = {
        ...state,
        dirty: true,
        templateContent: {
          ...state.templateContent,
          [templateId]: { text },
        },
        dirtyTemplateIds: state.dirtyTemplateIds.includes(templateId)
          ? state.dirtyTemplateIds
          : [...state.dirtyTemplateIds, templateId],
      };
      notify();
    },
    setTemplateBytes: async (templateId, bytes) => {
      state = {
        ...state,
        dirty: true,
        templateContent: {
          ...state.templateContent,
          [templateId]: { bytes },
        },
        dirtyTemplateIds: state.dirtyTemplateIds.includes(templateId)
          ? state.dirtyTemplateIds
          : [...state.dirtyTemplateIds, templateId],
      };
      notify();
    },
    hydrateTemplateContent: (entries) => {
      state = {
        ...state,
        templateContent: { ...state.templateContent, ...entries },
      };
      notify();
    },
    pendingTemplateSync: () => {
      const upserts: Record<string, TemplateContentEntry> = {};
      for (const templateId of state.dirtyTemplateIds) {
        const entry = state.templateContent[templateId];
        if (entry) {
          upserts[templateId] = entry;
        }
      }
      return {
        upserts,
        deletes: state.pendingTemplateDeletes,
      };
    },
    clearPendingTemplateSync: () => {
      state = {
        ...state,
        pendingTemplateDeletes: [],
        dirtyTemplateIds: [],
      };
      notify();
    },
    markTemplateDeleted: (templateId) => {
      const { [templateId]: _removed, ...rest } = state.templateContent;
      const pendingTemplateDeletes = state.pendingTemplateDeletes.includes(
        templateId,
      )
        ? state.pendingTemplateDeletes
        : [...state.pendingTemplateDeletes, templateId];
      const dirtyTemplateIds = state.dirtyTemplateIds.filter(
        (id) => id !== templateId,
      );
      state = {
        ...state,
        dirty: true,
        templateContent: rest,
        pendingTemplateDeletes,
        dirtyTemplateIds,
      };
      notify();
    },
    recomputeLocal: () => {
      const diagnostics = diagnoseProject(state.project);
      const outcome = localDryRun(state.project);
      state = {
        ...state,
        diagnostics: [...diagnostics, ...outcome.diagnostics],
        compiled: outcome.compiled,
        localRun: outcome.results,
        graph: buildDependencyGraph(state.project),
      };
      notify();
    },
    setServerRun: (run) => {
      state = { ...state, serverRun: run };
      notify();
    },
    markSaved: () => {
      state = { ...state, dirty: false };
      notify();
    },
  };
}
