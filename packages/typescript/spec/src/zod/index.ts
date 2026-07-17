import { z } from "zod";

export const workspaceValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("public_literal"), dataType: z.enum(["string", "number", "boolean", "date"]), value: z.unknown() }),
  z.object({ kind: z.literal("secret_ref"), ref: z.string().regex(/^sec:.+/), displayHint: z.string().optional() }),
  z.object({ kind: z.literal("eq_token"), token: z.string(), domain: z.string().optional() }),
  z.object({ kind: z.literal("shape_token"), shape: z.enum(["email", "phone", "iban", "uuid", "code"]), length: z.number().int().nonnegative().optional() }),
  z.object({ kind: z.literal("bucket"), bucket: z.string(), bounds: z.tuple([z.number(), z.number()]).optional() }),
  z.object({ kind: z.literal("redacted"), reason: z.enum(["secret", "policy", "consent", "unknown"]) }),
]);
export const ruleSchema: z.ZodType<unknown> = z.lazy(() => z.object({ op: z.enum(["and", "or", "not", "eq", "ne", "lt", "le", "gt", "ge", "has", "const", "var"]), args: z.array(z.unknown()) }).strict());
export const bitSchema = z.object({ id: z.string().min(1), type: z.string().min(1), label: z.string().optional(), when: z.union([z.literal(true), ruleSchema]), config: z.record(z.unknown()), reads: z.array(z.string()), writes: z.array(z.string()), emits: z.array(z.string()), effectClass: z.string(), onError: z.enum(["abort", "skip", "continue"]), capabilities: z.array(z.string()) }).strict();
export const projectSchema = z.object({ schemaVersion: z.literal("1.0.0"), id: z.string().min(1), name: z.string().min(1), description: z.string().optional(), pluginRequirements: z.array(z.object({ name: z.string().min(1), versionRange: z.string().min(1) }).strict()), workspace: z.object({ variables: z.array(z.object({ key: z.string().min(1), schema: z.record(z.unknown()), defaultValue: workspaceValueSchema, const: z.boolean().optional(), exposure: z.enum(["backendOnly", "redactedToClient", "clientVisible"]), description: z.string().optional() }).strict()) }).strict(), bits: z.array(bitSchema), documents: z.array(z.object({ id: z.string(), type: z.string() }).passthrough()), templates: z.array(z.object({ id: z.string(), path: z.string(), hash: z.string().optional() }).strict()), metadata: z.record(z.unknown()) }).strict();
