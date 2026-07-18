import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { migrateProject, type WorkspaceValue } from "@roborean/spec";
import {
  compileProject,
  runProject,
  type CompiledProject,
  type RunResults,
} from "../src/index.js";
import { normalizeConformance } from "./normalizeConformance.js";

const root = resolve(import.meta.dirname, "../../../../");
const runsDir = resolve(root, "conformance/runs");

/**
 * Match Python optional null fields on workspace values in compiled output.
 *
 * @param value - Workspace value from the project document.
 * @returns JSON-shaped value with explicit null optionals.
 */
function workspaceValueToJson(value: WorkspaceValue): unknown {
  if (value.kind === "secret_ref") {
    return {
      kind: value.kind,
      ref: value.ref,
      displayHint: value.displayHint ?? null,
    };
  }
  return value;
}

/**
 * Serialize compiled output to match Python ``model_dump(by_alias=True)`` shape.
 *
 * @param compiled - Engine compile result.
 * @returns JSON-compatible compiled project document.
 */
function compiledToJson(compiled: CompiledProject): Record<string, unknown> {
  return {
    schemaVersion: compiled.schemaVersion,
    projectId: compiled.projectId,
    projectName: compiled.projectName,
    compiledAt: compiled.compiledAt,
    engineVersion: compiled.engineVersion,
    ruleProfileVersion: compiled.ruleProfileVersion,
    digest: compiled.digest,
    variables: compiled.variables.map((variable) => ({
      ...variable,
      description: variable.description ?? null,
      const: variable.const ?? false,
      defaultValue: workspaceValueToJson(variable.defaultValue),
    })),
    bits: compiled.bits.map((bit) => ({
      ...bit,
      label: bit.label ?? null,
    })),
    activationExpressions: compiled.activationExpressions,
    dependencyMap: compiled.dependencyMap,
    documents: compiled.documents,
    templates: compiled.templates,
    pluginVersions: compiled.pluginVersions,
    diagnostics: compiled.diagnostics.map((item) => ({
      ...item,
      path: item.path ?? null,
    })),
  };
}

/**
 * Serialize run results for golden comparison.
 *
 * @param results - Engine run output.
 * @returns JSON-compatible run-results document.
 */
function runResultsToJson(results: RunResults): Record<string, unknown> {
  return {
    runId: results.runId,
    projectId: results.projectId,
    projectDigest: results.projectDigest,
    startedAt: results.startedAt,
    finishedAt: results.finishedAt,
    status: results.status,
    inputWorkspaceHash: results.inputWorkspaceHash,
    finalWorkspaceHash: results.finalWorkspaceHash,
    bitResults: results.bitResults.map((bit) => ({
      ...bit,
      diagnostics: bit.diagnostics.map((item) => ({
        ...item,
        path: item.path ?? null,
      })),
    })),
    artifacts: results.artifacts,
    engineVersion: results.engineVersion,
    ruleProfileVersion: results.ruleProfileVersion,
  };
}

/**
 * List conformance run fixture directory names.
 *
 * @returns Sorted fixture ids under ``conformance/runs``.
 */
function listRunFixtures(): string[] {
  return readdirSync(runsDir)
    .filter((name) => statSync(join(runsDir, name)).isDirectory())
    .sort();
}

describe("conformance/runs golden artifacts", () => {
  for (const name of listRunFixtures()) {
    it(`matches expected compiled and run-results for ${name}`, () => {
      const fixtureDir = join(runsDir, name);
      const project = JSON.parse(
        readFileSync(join(fixtureDir, "input.project.json"), "utf8"),
      );
      const expectedCompiled = JSON.parse(
        readFileSync(join(fixtureDir, "expected.compiled.json"), "utf8"),
      );
      const expectedRun = JSON.parse(
        readFileSync(join(fixtureDir, "expected.run-results.json"), "utf8"),
      );

      const migrated = migrateProject(project);
      const compiled = compileProject(migrated);
      const run = runProject(compiled, migrated);

      expect(normalizeConformance(compiledToJson(compiled))).toEqual(
        normalizeConformance(expectedCompiled),
      );
      expect(normalizeConformance(runResultsToJson(run))).toEqual(
        normalizeConformance(expectedRun),
      );
    });
  }
});
