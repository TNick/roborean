import type { Project } from "@roborean/spec";

export type DependencyNode =
  | { kind: "variable"; key: string }
  | { kind: "bit"; id: string }
  | { kind: "document"; id: string };

export type DependencyEdge = {
  from: DependencyNode;
  to: DependencyNode;
  reason: "read" | "write" | "emit" | "activates";
};

/** Build a simple dependency graph for the editor. */
export function buildDependencyGraph(project: Project): {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
} {
  const nodes: DependencyNode[] = [];
  const edges: DependencyEdge[] = [];
  for (const variable of project.workspace.variables) {
    nodes.push({ kind: "variable", key: variable.key });
  }
  for (const bit of project.bits) {
    nodes.push({ kind: "bit", id: bit.id });
    for (const key of bit.reads) {
      edges.push({
        from: { kind: "bit", id: bit.id },
        to: { kind: "variable", key },
        reason: "read",
      });
    }
    for (const key of bit.writes) {
      edges.push({
        from: { kind: "bit", id: bit.id },
        to: { kind: "variable", key },
        reason: "write",
      });
    }
    for (const docId of bit.emits) {
      edges.push({
        from: { kind: "bit", id: bit.id },
        to: { kind: "document", id: docId },
        reason: "emit",
      });
      if (!nodes.some((node) => node.kind === "document" && node.id === docId)) {
        nodes.push({ kind: "document", id: docId });
      }
    }
  }
  for (const document of project.documents) {
    if (!nodes.some((node) => node.kind === "document" && node.id === document.id)) {
      nodes.push({ kind: "document", id: document.id });
    }
  }
  return { nodes, edges };
}
