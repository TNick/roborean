import type { Project, WorkspaceValue } from "@roborean/spec";

function scrubValue(value: WorkspaceValue): WorkspaceValue {
  if (value.kind === "secret_ref") {
    return { kind: "redacted", reason: "secret" };
  }
  return value;
}

/** JSON paths that still reference raw secret literals (tests). */
export function findSecretLeakPaths(project: Project): string[] {
  const leaks: string[] = [];
  for (const variable of project.workspace.variables) {
    if (
      variable.exposure === "backendOnly" &&
      variable.defaultValue.kind === "public_literal"
    ) {
      leaks.push(`/workspace/variables/${variable.key}/defaultValue`);
    }
  }
  return leaks;
}

/** Remove secret-bearing defaults from editor state. */
export function scrubProjectForEditor(project: Project): Project {
  return {
    ...project,
    documents: project.documents.map((document) => ({
      ...document,
      title:
        typeof document.title === "string" && document.title.trim()
          ? document.title
          : document.id,
    })),
    workspace: {
      variables: project.workspace.variables.map((variable) => ({
        ...variable,
        defaultValue:
          variable.exposure === "backendOnly" ||
          variable.exposure === "redactedToClient"
            ? scrubValue(variable.defaultValue)
            : variable.defaultValue,
      })),
    },
  };
}
