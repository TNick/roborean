import { type Project, type RuleAst } from "@roborean/spec";
import {
  builtinManifests,
  ENGINE_VERSION,
  projectDigest,
  RULE_PROFILE_VERSION,
  parseRule,
  typecheckRule,
  type CompileOptions,
  type Diagnostic,
} from "./core.js";
import { migrateProject, validate } from "@roborean/spec";

export interface CompiledProject {
  schemaVersion: "1.0.0";
  projectId: string;
  projectName: string;
  compiledAt: string;
  engineVersion: string;
  ruleProfileVersion: string;
  digest: string;
  variables: Project["workspace"]["variables"];
  bits: Project["bits"];
  activationExpressions: Record<string, RuleAst>;
  dependencyMap: Record<
    string,
    { reads: string[]; writes: string[]; emits: string[] }
  >;
  documents: Project["documents"];
  templates: Project["templates"];
  pluginVersions: Record<string, string>;
  diagnostics: Diagnostic[];
}
export class CompileError extends Error {
  constructor(public readonly diagnostics: Diagnostic[]) {
    super(diagnostics.map((item) => item.message).join("; "));
  }
}
function configValid(
  schema: Record<string, unknown>,
  config: Record<string, unknown>,
): boolean {
  const required = (schema.required as string[] | undefined) ?? [];
  const properties =
    (schema.properties as Record<string, unknown> | undefined) ?? {};
  if (required.some((key) => !(key in config))) return false;
  if (
    schema.additionalProperties === false &&
    Object.keys(config).some((key) => !(key in properties))
  )
    return false;
  return true;
}
/** Migrates, validates, and compiles a project into an immutable execution plan. */
export function compileProject(
  input: unknown,
  options: CompileOptions = {},
): CompiledProject {
  const strict = options.strict !== false;
  let project: Project;
  const diagnostics: Diagnostic[] = [];
  try {
    project = migrateProject(input);
  } catch (error) {
    throw new CompileError([
      { severity: "error", code: "E_SCHEMA", message: String(error) },
    ]);
  }
  const schemaValidation = validate("project", project);
  if (!schemaValidation.valid)
    throw new CompileError([
      {
        severity: "error",
        code: "E_SCHEMA",
        message: JSON.stringify(schemaValidation.errors),
      },
    ]);
  const variableMap = new Map(
    project.workspace.variables.map((variable) => [variable.key, variable]),
  );
  const manifestMap = new Map(
    builtinManifests.map((manifest) => [manifest.typeId, manifest]),
  );
  const activationExpressions: Record<string, RuleAst> = {};
  const dependencyMap: CompiledProject["dependencyMap"] = {};
  for (const bit of project.bits) {
    const manifest = manifestMap.get(bit.type);
    if (!manifest)
      diagnostics.push({
        severity: "error",
        code: "E_UNKNOWN_BIT_TYPE",
        message: `Unknown bit type: ${bit.type}`,
      });
    else if (!configValid(manifest.configSchema, bit.config))
      diagnostics.push({
        severity: "error",
        code: "E_CONFIG",
        message: `Invalid config for ${bit.id}`,
      });
    if (bit.when !== true) {
      try {
        const rule = parseRule(bit.when);
        typecheckRule(rule, variableMap);
        activationExpressions[bit.id] = rule;
      } catch (error) {
        diagnostics.push({
          severity: "error",
          code: "E_RULE_TYPE",
          message: String(error),
        });
      }
    }
    for (const key of [...bit.reads, ...bit.writes]) {
      if (!variableMap.has(key) && strict) {
        diagnostics.push({
          severity: "error",
          code: "E_UNDECLARED_WRITE",
          message: `Undeclared variable access: ${key}`,
        });
      }
    }
    if (
      bit.type === "roborean.set_variable" &&
      typeof bit.config.key === "string" &&
      !bit.writes.includes(bit.config.key)
    ) {
      diagnostics.push({
        severity: "error",
        code: "E_UNDECLARED_WRITE",
        message: `Bit ${bit.id} writes undeclared key: ${bit.config.key}`,
      });
    }
    if (
      bit.type === "roborean.copy_variable" &&
      typeof bit.config.to === "string" &&
      !bit.writes.includes(bit.config.to)
    ) {
      diagnostics.push({
        severity: "error",
        code: "E_UNDECLARED_WRITE",
        message: `Bit ${bit.id} writes undeclared key: ${bit.config.to}`,
      });
    }
    dependencyMap[bit.id] = {
      reads: [...bit.reads],
      writes: [...bit.writes],
      emits: [...bit.emits],
    };
  }
  if (project.documents.length > 0 && options.allowUnresolvedDocuments) {
    diagnostics.push({
      severity: "warning",
      code: "E_SCHEMA",
      message: "Document validation skipped (allowUnresolvedDocuments)",
    });
  }
  for (const variable of project.workspace.variables)
    if (
      !project.bits.some(
        (bit) =>
          bit.reads.includes(variable.key) || bit.writes.includes(variable.key),
      )
    )
      diagnostics.push({
        severity: "warning",
        code: "W_UNUSED_VARIABLE",
        message: `Unused variable: ${variable.key}`,
      });
  for (const bit of project.bits)
    if (
      bit.when !== true &&
      bit.when.op === "const" &&
      bit.when.args[0] === false
    )
      diagnostics.push({
        severity: "warning",
        code: "W_DEAD_BIT",
        message: `Dead bit: ${bit.id}`,
      });
  if (diagnostics.some((item) => item.severity === "error"))
    throw new CompileError(diagnostics);
  return {
    schemaVersion: project.schemaVersion ?? "1.0.0",
    projectId: project.id,
    projectName: project.name,
    compiledAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    ruleProfileVersion: RULE_PROFILE_VERSION,
    digest: projectDigest(project),
    variables: project.workspace.variables,
    bits: project.bits,
    activationExpressions,
    dependencyMap,
    documents: project.documents,
    templates: project.templates,
    pluginVersions: Object.fromEntries(
      builtinManifests.map((manifest) => [manifest.typeId, manifest.version]),
    ),
    diagnostics,
  };
}
