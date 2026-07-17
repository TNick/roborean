import type { Project } from "@roborean/spec";
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

export type EditorState = {
  project: Project;
  compiled: CompiledProject | null;
  localRun: RunResults | null;
  serverRun: RunDetail | null;
  diagnostics: EditorDiagnostic[];
  selectedBitId: string | null;
  graph: { nodes: DependencyNode[]; edges: DependencyEdge[] } | null;
  dirty: boolean;
};

export type EditorStore = {
  getState: () => EditorState;
  subscribe: (listener: () => void) => () => void;
  replaceProject: (project: Project) => void;
  selectBit: (bitId: string | null) => void;
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
    graph: buildDependencyGraph(initial),
    dirty: false,
  };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

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
      state = { ...state, selectedBitId: bitId };
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
