export type JsonScalar = string | number | boolean | null;
export type WorkspaceValue =
  | {
      kind: "public_literal";
      dataType: "string" | "number" | "boolean" | "date";
      value: JsonScalar;
    }
  | { kind: "secret_ref"; ref: string; displayHint?: string }
  | { kind: "eq_token"; token: string; domain?: string }
  | {
      kind: "shape_token";
      shape: "email" | "phone" | "iban" | "uuid" | "code";
      length?: number;
    }
  | { kind: "bucket"; bucket: string; bounds?: [number, number] }
  | { kind: "redacted"; reason: "secret" | "policy" | "consent" | "unknown" };

export interface Variable {
  key: string;
  schema: Record<string, unknown>;
  defaultValue: WorkspaceValue;
  const?: boolean;
  exposure: "backendOnly" | "redactedToClient" | "clientVisible";
  description?: string;
}
export interface RuleAst {
  op:
    | "and"
    | "or"
    | "not"
    | "eq"
    | "ne"
    | "lt"
    | "le"
    | "gt"
    | "ge"
    | "has"
    | "const"
    | "var";
  args: Array<RuleAst | string | JsonScalar>;
}
export interface Bit {
  id: string;
  type: string;
  label?: string;
  when: true | RuleAst;
  config: Record<string, unknown>;
  reads: string[];
  writes: string[];
  emits: string[];
  effectClass: string;
  onError: "abort" | "skip" | "continue";
  capabilities: string[];
}
export interface DocumentDefinition {
  id: string;
  title: string;
  description?: string;
  type: string;
  templateRef?: string;
  baseTemplateRef?: string;
  [key: string]: unknown;
}
export interface Project {
  schemaVersion: "1.0.0";
  id: string;
  name: string;
  description?: string;
  pluginRequirements: Array<{ name: string; versionRange: string }>;
  workspace: { variables: Variable[] };
  bits: Bit[];
  documents: DocumentDefinition[];
  templates: Array<{ id: string; path: string; hash?: string }>;
  metadata: Record<string, unknown>;
}
export type WorkspacePatchOp =
  | { op: "set"; key: string; value: WorkspaceValue }
  | { op: "unset"; key: string }
  | { op: "reject"; key: string; reason: string };
export interface WorkspacePatch {
  ops: WorkspacePatchOp[];
}
export interface WorkspaceSnapshot {
  values: Record<string, WorkspaceValue>;
  provenance: Record<string, unknown>;
}
export interface BitTypeManifest {
  typeId: string;
  name: string;
  version: string;
  configSchema: Record<string, unknown>;
  effectClass: string;
  capabilities: string[];
  readsFromConfig?: boolean;
  browserSafe: boolean;
}
