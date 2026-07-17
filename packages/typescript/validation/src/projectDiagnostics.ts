import type { Project } from "@roborean/spec";
import { validate } from "@roborean/spec";

export type EditorDiagnostic = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  path?: string;
};

/** Run schema validation and surface editor-friendly diagnostics. */
export function diagnoseProject(project: Project): EditorDiagnostic[] {
  const result = validate("project", project);
  if (result.valid || !result.errors?.length) {
    return [];
  }
  return result.errors.map((item) => ({
    severity: "error" as const,
    code: "E_SCHEMA",
    message: item.message ?? "Schema validation failed",
    path: item.instancePath || "/",
  }));
}
