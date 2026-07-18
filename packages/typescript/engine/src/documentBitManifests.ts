import type { BitTypeManifest } from "@roborean/spec";

/**
 * Built-in document and test-helper bit manifests (parity with Python engine).
 */
export const documentBitManifests: BitTypeManifest[] = [
  {
    typeId: "roborean.replace_named_value",
    name: "Replace named value",
    version: "1.0.0",
    configSchema: {
      type: "object",
      required: ["documentId", "name"],
      properties: {
        documentId: { type: "string" },
        name: { type: "string" },
        fromKey: { type: "string" },
        value: {},
      },
      additionalProperties: false,
    },
    effectClass: "document",
    capabilities: ["document.write"],
    readsFromConfig: true,
    browserSafe: true,
  },
  {
    typeId: "roborean.append_text",
    name: "Append text",
    version: "1.0.0",
    configSchema: {
      type: "object",
      required: ["documentId", "text"],
      properties: {
        documentId: { type: "string" },
        text: { type: "string" },
        op: { type: "string" },
      },
      additionalProperties: false,
    },
    effectClass: "document",
    capabilities: ["document.write"],
    readsFromConfig: false,
    browserSafe: true,
  },
  {
    typeId: "roborean.flow_append_paragraph",
    name: "Append paragraph",
    version: "1.0.0",
    configSchema: {
      type: "object",
      required: ["documentId", "ops"],
      properties: {
        documentId: { type: "string" },
        ops: { type: "array" },
      },
      additionalProperties: false,
    },
    effectClass: "document",
    capabilities: ["document.write"],
    readsFromConfig: false,
    browserSafe: true,
  },
  {
    typeId: "roborean.sheet_set_cells",
    name: "Set cells",
    version: "1.0.0",
    configSchema: {
      type: "object",
      required: ["documentId"],
      properties: {
        documentId: { type: "string" },
        cells: { type: "array" },
        formulas: { type: "array" },
      },
      additionalProperties: false,
    },
    effectClass: "document",
    capabilities: ["document.write"],
    readsFromConfig: true,
    browserSafe: false,
  },
  {
    typeId: "roborean.drawing_insert_polyline",
    name: "Insert polyline",
    version: "1.0.0",
    configSchema: {
      type: "object",
      required: ["documentId", "ops"],
      properties: {
        documentId: { type: "string" },
        ops: { type: "array" },
      },
      additionalProperties: false,
    },
    effectClass: "document",
    capabilities: ["document.write"],
    readsFromConfig: false,
    browserSafe: false,
  },
  {
    typeId: "roborean.raster_draw_text",
    name: "Draw text",
    version: "1.0.0",
    configSchema: {
      type: "object",
      required: ["documentId", "ops"],
      properties: {
        documentId: { type: "string" },
        ops: { type: "array" },
      },
      additionalProperties: false,
    },
    effectClass: "document",
    capabilities: ["document.write"],
    readsFromConfig: false,
    browserSafe: false,
  },
  {
    typeId: "roborean.fake_network",
    name: "Fake network",
    version: "1.0.0",
    configSchema: {
      type: "object",
      additionalProperties: false,
    },
    effectClass: "network",
    capabilities: [],
    readsFromConfig: false,
    browserSafe: false,
  },
];
