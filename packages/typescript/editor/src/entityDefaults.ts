import type {
  Bit,
  DocumentDefinition,
  Project,
  Variable,
} from "@roborean/spec";

import { getBitManifest } from "./bitManifestRegistry.js";
import { defaultWorkspaceValueForKind } from "./forms/workspaceValueDefaults.js";

/**
 * Pick a unique string id among existing values.
 *
 * @param prefix - Id prefix (for example ``variable``).
 * @param existing - Ids already in use.
 * @returns Unused id ``prefix_N``.
 */
export function uniqueEntityId(prefix: string, existing: string[]): string {
  let index = 1;
  while (existing.includes(`${prefix}_${index}`)) {
    index += 1;
  }
  return `${prefix}_${index}`;
}

/**
 * Seed a bit config object from a JSON Schema fragment.
 *
 * @param schema - Manifest config schema.
 * @param project - Project used for documentId defaults.
 * @returns Config object with required keys populated.
 */
export function seedBitConfig(
  schema: Record<string, unknown> | undefined,
  project: Project,
): Record<string, unknown> {
  if (!schema || schema.type !== "object") {
    return {};
  }
  const required = (schema.required as string[] | undefined) ?? [];
  const properties =
    (schema.properties as Record<string, { type?: string }> | undefined) ?? {};
  const config: Record<string, unknown> = {};
  for (const key of required) {
    if (key === "documentId") {
      config[key] = project.documents[0]?.id ?? "";
    } else if (key === "value" && properties[key]?.type === undefined) {
      config[key] = defaultWorkspaceValueForKind("public_literal");
    } else if (properties[key]?.type === "array") {
      config[key] = [];
    } else if (properties[key]?.type === "number") {
      config[key] = 0;
    } else {
      config[key] = "";
    }
  }
  return config;
}

/**
 * Build a default workspace variable for the editor.
 *
 * @param key - New variable key.
 * @returns Variable document.
 */
export function defaultVariable(key: string): Variable {
  return {
    key,
    schema: { type: "string" },
    defaultValue: {
      kind: "public_literal",
      dataType: "string",
      value: "",
    },
    const: false,
    exposure: "clientVisible",
  };
}

/**
 * Build a default bit for the editor.
 *
 * @param id - New bit id.
 * @param typeId - Bit type identifier.
 * @param project - Project used for config defaults.
 * @returns Bit document.
 */
export function defaultBit(id: string, typeId: string, project: Project): Bit {
  const manifest = getBitManifest(typeId);
  const bit: Bit = {
    id,
    type: typeId,
    when: true,
    config: seedBitConfig(manifest?.configSchema, project),
    reads: [],
    writes: [],
    emits: [],
    effectClass: manifest?.effectClass ?? "workspace",
    onError: "abort",
    capabilities: manifest?.capabilities ?? [],
  };

  if (manifest?.name?.trim()) {
    bit.label = manifest.name.trim();
  }

  return bit;
}

/**
 * Build a default text document definition and template ref.
 *
 * @param id - New document id.
 * @returns Document definition and template entry to append.
 */
export function defaultDocument(id: string): {
  document: DocumentDefinition;
  template: { id: string; path: string };
} {
  return {
    document: {
      id,
      title: `Document ${id.replace(/^doc_/, "")}`,
      type: "text",
      driver: "roborean.text",
      templateRef: id,
      outputTarget: `${id}.txt`,
      irFamily: "plain",
      settings: {},
      preview: { mode: "text", enabled: true },
    },
    template: { id, path: `templates/${id}.txt` },
  };
}
