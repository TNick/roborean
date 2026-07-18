import { type Project, type WorkspacePatch } from "@roborean/spec";
import {
  applyPatch,
  ENGINE_VERSION,
  evaluateRule,
  executeBit,
  initialSnapshot,
  RULE_PROFILE_VERSION,
  workspaceHash,
  type Diagnostic,
} from "./core.js";
import { newUuid } from "./crypto_iso.js";
import type { CompiledProject } from "./compiler.js";

export interface RunOptions {
  runId?: string;
  dryRun?: boolean;
  stopOnBitError?: boolean;
}
export interface BitResult {
  bitId: string;
  type: string;
  active: boolean;
  activationReason: boolean | "always";
  status: "success" | "skipped" | "failed" | "inactive";
  durationMs: number;
  workspacePatch: WorkspacePatch;
  documentOps: unknown[];
  diagnostics: Diagnostic[];
  pluginVersion: string;
}
export interface RunResults {
  runId: string;
  projectId: string;
  projectDigest: string;
  startedAt: string;
  finishedAt: string;
  status: "success" | "failed" | "aborted";
  inputWorkspaceHash: string;
  finalWorkspaceHash: string;
  bitResults: BitResult[];
  artifacts: unknown[];
  engineVersion: string;
  ruleProfileVersion: string;
}
/** Executes compiled bits sequentially using audited, immutable patches. */
export function runProject(
  compiled: CompiledProject,
  project: Project,
  options: RunOptions = {},
): RunResults {
  const startedAt = new Date().toISOString();
  let workspace = initialSnapshot(project);
  const inputWorkspaceHash = workspaceHash(workspace);
  const constKeys = project.workspace.variables
    .filter((variable) => variable.const)
    .map((variable) => variable.key);
  const bitResults: BitResult[] = [];
  let status: RunResults["status"] = "success";
  for (const bit of compiled.bits) {
    const started = performance.now();
    let active = true;
    try {
      active = bit.when === true ? true : evaluateRule(bit.when, workspace);
    } catch (error) {
      bitResults.push({
        bitId: bit.id,
        type: bit.type,
        active: false,
        activationReason: false,
        status: "failed",
        durationMs: performance.now() - started,
        workspacePatch: { ops: [] },
        documentOps: [],
        diagnostics: [
          { severity: "error", code: "E_RULE_EVAL", message: String(error) },
        ],
        pluginVersion: compiled.pluginVersions[bit.type] ?? "",
      });
      status = "failed";
      if (bit.onError === "abort" || options.stopOnBitError !== false) break;
      continue;
    }
    if (!active) {
      bitResults.push({
        bitId: bit.id,
        type: bit.type,
        active: false,
        activationReason: false,
        status: "inactive",
        durationMs: performance.now() - started,
        workspacePatch: { ops: [] },
        documentOps: [],
        diagnostics: [],
        pluginVersion: compiled.pluginVersions[bit.type] ?? "",
      });
      continue;
    }
    try {
      const { workspacePatch: patch, documentOps } = executeBit(bit, workspace);
      const [next, audited] = applyPatch(workspace, patch, {
        allowedWrites: bit.writes,
        constKeys,
        bitId: bit.id,
      });
      const rejected = audited.ops.filter(
        (operation) => operation.op === "reject",
      );
      const diagnostics = rejected.map((operation) => ({
        severity: "error" as const,
        code:
          operation.reason === "const" ? "E_CONST_WRITE" : "E_UNDECLARED_WRITE",
        message: `${operation.reason}: ${operation.key}`,
      }));
      workspace = next;
      bitResults.push({
        bitId: bit.id,
        type: bit.type,
        active: true,
        activationReason: bit.when === true ? "always" : true,
        status: rejected.length ? "failed" : "success",
        durationMs: performance.now() - started,
        workspacePatch: audited,
        documentOps,
        diagnostics,
        pluginVersion: compiled.pluginVersions[bit.type] ?? "",
      });
      if (rejected.length) {
        status = "failed";
        if (bit.onError === "abort" || options.stopOnBitError !== false) break;
      }
    } catch (error) {
      bitResults.push({
        bitId: bit.id,
        type: bit.type,
        active: true,
        activationReason: bit.when === true ? "always" : true,
        status: "failed",
        durationMs: performance.now() - started,
        workspacePatch: { ops: [] },
        documentOps: [],
        diagnostics: [
          { severity: "error", code: "E_CONFIG", message: String(error) },
        ],
        pluginVersion: compiled.pluginVersions[bit.type] ?? "",
      });
      status = "failed";
      if (bit.onError === "abort" || options.stopOnBitError !== false) break;
    }
  }
  return {
    runId: options.runId ?? newUuid(),
    projectId: project.id,
    projectDigest: compiled.digest,
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    inputWorkspaceHash,
    finalWorkspaceHash: workspaceHash(workspace),
    bitResults,
    artifacts: [],
    engineVersion: ENGINE_VERSION,
    ruleProfileVersion: RULE_PROFILE_VERSION,
  };
}
