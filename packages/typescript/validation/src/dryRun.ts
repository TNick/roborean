import type { Project } from "@roborean/spec";
import {
  compileProject,
  isBrowserRunnableBitType,
  runProject,
  type Diagnostic,
} from "@roborean/engine";

import type { EditorDiagnostic } from "./projectDiagnostics.js";

function mapDiagnostic(item: Diagnostic): EditorDiagnostic {
  return {
    severity: item.severity,
    code: item.code,
    message: item.message,
    path: item.path,
  };
}

/** Compile and dry-run purely in the browser. */
export function localDryRun(project: Project): {
  compiled: ReturnType<typeof compileProject> | null;
  results: ReturnType<typeof runProject> | null;
  diagnostics: EditorDiagnostic[];
} {
  const diagnostics: EditorDiagnostic[] = [];

  for (const bit of project.bits) {
    if (!isBrowserRunnableBitType(bit.type)) {
      diagnostics.push({
        severity: "warning",
        code: "W_BACKEND_ONLY_SKIPPED",
        message: `Bit ${bit.id} requires backend execution`,
        path: `/bits/${bit.id}/effectClass`,
      });
    }
  }

  try {
    const compiled = compileProject(project, { strict: true });
    diagnostics.push(...compiled.diagnostics.map(mapDiagnostic));

    if (compiled.diagnostics.some((item) => item.severity === "error")) {
      return { compiled: null, results: null, diagnostics };
    }

    const runnableCompiled = {
      ...compiled,
      bits: compiled.bits.filter((bit) => isBrowserRunnableBitType(bit.type)),
    };
    const results = runProject(runnableCompiled, project, { dryRun: true });

    return { compiled, results, diagnostics };
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "E_COMPILE",
      message: String(error),
    });
    return { compiled: null, results: null, diagnostics };
  }
}
