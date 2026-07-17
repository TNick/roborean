export type DocumentOperation = {
  documentId: string;
  op: string;
  [key: string]: unknown;
};

export type TemplateManifest = {
  templateId: string;
  templateVersion: string;
  documentType: string;
  driver: string;
  requiredInputs: string[];
  capabilities: string[];
  declaredSlots: Record<string, { kind: string; required?: boolean }>;
};

export type DriverManifest = {
  driverId: string;
  version: string;
  irFamily: string;
  capabilities: string[];
  supportsPreview: boolean;
  supportsBrowserExecution: boolean;
  supportsDiff: boolean;
  requiresBackend: boolean;
  templateMediaTypes: string[];
};

export type DocumentPreview = {
  documentId: string;
  mode: "text" | "html" | "drawing-json";
  body: unknown;
  warnings: string[];
  generatedAt: string;
  renderer: { package: string; version: string };
};
