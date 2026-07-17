import { createHash, randomUUID } from "node:crypto";
import { migrateProject, validate, type Bit, type BitTypeManifest, type Project, type RuleAst, type WorkspacePatch, type WorkspaceSnapshot, type WorkspaceValue } from "@roborean/spec";

export const ENGINE_VERSION = "0.3.0";
export const RULE_PROFILE_VERSION = "1.0.0";
export class RuleEvalError extends Error {}
export class RuleTypeError extends Error {}
export interface Diagnostic { severity: "error" | "warning" | "info"; code: string; message: string; path?: string }
export interface CompileOptions { strict?: boolean; allowUnresolvedDocuments?: boolean }

/** Produces canonical JSON with recursive lexicographic object-key ordering. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}
export function sha256Hex(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function workspaceHash(snapshot: WorkspaceSnapshot): string { return sha256Hex(stableStringify(snapshot.values)); }
export function projectDigest(project: Project): string { return sha256Hex(stableStringify(project)); }

export function initialSnapshot(project: Project): WorkspaceSnapshot {
  return { values: Object.fromEntries(project.workspace.variables.map((variable) => [variable.key, structuredClone(variable.defaultValue)])), provenance: {} };
}
export function applyPatch(snapshot: WorkspaceSnapshot, patch: WorkspacePatch, options: { allowedWrites: Iterable<string>; constKeys: Iterable<string>; bitId?: string; strictUndeclaredAccess?: boolean }): [WorkspaceSnapshot, WorkspacePatch] {
  const allowed = new Set(options.allowedWrites);
  const constants = new Set(options.constKeys);
  const values = structuredClone(snapshot.values);
  const provenance = structuredClone(snapshot.provenance);
  const audited: WorkspacePatch["ops"] = [];
  for (const operation of patch.ops) {
    if (!allowed.has(operation.key) && options.strictUndeclaredAccess !== false) {
      audited.push({ op: "reject", key: operation.key, reason: "undeclared_write" });
    } else if (constants.has(operation.key)) {
      audited.push({ op: "reject", key: operation.key, reason: "const" });
    } else if (operation.op === "set") {
      values[operation.key] = structuredClone(operation.value);
      provenance[operation.key] = { bitId: options.bitId };
      audited.push(structuredClone(operation));
    } else if (operation.op === "unset") {
      delete values[operation.key];
      delete provenance[operation.key];
      audited.push(structuredClone(operation));
    } else {
      audited.push(structuredClone(operation));
    }
  }
  return [{ values, provenance }, { ops: audited }];
}

export function parseRule(data: unknown): RuleAst {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new RuleTypeError("Rule must be an object");
  const rule = data as RuleAst;
  if (!Array.isArray(rule.args) || !["and", "or", "not", "eq", "ne", "lt", "le", "gt", "ge", "has", "const", "var"].includes(rule.op)) throw new RuleTypeError("Invalid rule AST");
  return rule;
}
function variableName(rule: unknown): string | undefined {
  return typeof rule === "string" ? rule : rule && typeof rule === "object" && (rule as RuleAst).op === "var" && typeof (rule as RuleAst).args[0] === "string" ? (rule as RuleAst).args[0] as string : undefined;
}
export function typecheckRule(rule: RuleAst, variables: Map<string, { defaultValue: WorkspaceValue }>): void {
  const check = (node: RuleAst, comparable = false): void => {
    if (node.op === "var") {
      const key = variableName(node);
      if (!key || !variables.has(key)) throw new RuleTypeError(`Unknown variable: ${key ?? ""}`);
      if (comparable && variables.get(key)?.defaultValue.kind === "secret_ref") throw new RuleTypeError(`Secret variable cannot be compared: ${key}`);
    }
    const comparison = ["eq", "ne", "lt", "le", "gt", "ge"].includes(node.op);
    for (const argument of node.args) if (argument && typeof argument === "object" && "op" in argument) check(argument as RuleAst, comparable || comparison);
  };
  check(rule);
}
function unwrap(value: WorkspaceValue): unknown {
  if (value.kind !== "public_literal") throw new RuleEvalError(`Cannot evaluate ${value.kind}`);
  return value.value;
}
export function evaluateRule(rule: RuleAst, workspace: WorkspaceSnapshot, options: { strict?: boolean } = {}): boolean {
  const evaluate = (node: RuleAst): unknown => {
    const args = node.args;
    if (node.op === "const") return args[0];
    if (node.op === "var") {
      const key = String(args[0]);
      const value = workspace.values[key];
      if (!value) { if (options.strict === false) return null; throw new RuleEvalError(`Missing variable: ${key}`); }
      return unwrap(value);
    }
    if (node.op === "has") return Boolean(workspace.values[variableName(args[0]) ?? ""]);
    if (node.op === "not") return !Boolean(evaluate(args[0] as RuleAst));
    if (node.op === "and") return args.every((arg) => Boolean(evaluate(arg as RuleAst)));
    if (node.op === "or") return args.some((arg) => Boolean(evaluate(arg as RuleAst)));
    const [left, right] = args.map((arg) => evaluate(arg as RuleAst));
    if (node.op === "eq") return left === right;
    if (node.op === "ne") return left !== right;
    if (typeof left !== typeof right || !["number", "string"].includes(typeof left)) throw new RuleEvalError("Ordered comparison requires compatible values");
    if (node.op === "lt") return (left as number | string) < (right as number | string);
    if (node.op === "le") return (left as number | string) <= (right as number | string);
    if (node.op === "gt") return (left as number | string) > (right as number | string);
    return (left as number | string) >= (right as number | string);
  };
  return Boolean(evaluate(rule));
}

export const builtinManifests: BitTypeManifest[] = [
  { typeId: "roborean.noop", version: "1.0.0", configSchema: { type: "object", additionalProperties: false }, effectClass: "pure", capabilities: [], browserSafe: true },
  { typeId: "roborean.set_variable", version: "1.0.0", configSchema: { type: "object", required: ["key", "value"], properties: { key: { type: "string" }, value: {} }, additionalProperties: false }, effectClass: "workspace", capabilities: ["workspace.write"], browserSafe: true },
  { typeId: "roborean.copy_variable", version: "1.0.0", configSchema: { type: "object", required: ["from", "to"], properties: { from: { type: "string" }, to: { type: "string" } }, additionalProperties: false }, effectClass: "workspace", capabilities: ["workspace.read", "workspace.write"], browserSafe: true },
];
export function executeBit(bit: Bit, workspace: WorkspaceSnapshot): WorkspacePatch {
  if (bit.type === "roborean.noop") return { ops: [] };
  if (bit.type === "roborean.set_variable") return { ops: [{ op: "set", key: String(bit.config.key), value: bit.config.value as WorkspaceValue }] };
  if (bit.type === "roborean.copy_variable") {
    const from = String(bit.config.from); const to = String(bit.config.to); const value = workspace.values[from];
    if (!value) throw new Error(`Missing source variable: ${from}`);
    return { ops: [{ op: "set", key: to, value: structuredClone(value) }] };
  }
  throw new Error(`Unknown bit type: ${bit.type}`);
}
