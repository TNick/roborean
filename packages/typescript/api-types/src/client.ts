/** Hand-maintained API DTOs aligned with OpenAPI (regenerate via make openapi). */

export type ProjectSummary = {
  id: string;
  name: string;
  schemaVersion: string;
};

export type ProjectDetail = { project: object };

export type ProjectCreate = { project: object };

export type ProjectUpdate = { project: object };

export type RunDetail = {
  runId: string;
  projectId: string;
  status: string;
  results?: Record<string, unknown> | null;
  diff?: Record<string, unknown> | null;
  error?: Record<string, unknown> | null;
};

export type RunCreate = {
  dryRun?: boolean;
  stopOnBitError?: boolean;
  workspaceOverrides?: Record<string, unknown>;
};

export type RunSummary = {
  runId: string;
  projectId: string;
  status: string;
  createdAt: string;
  finishedAt?: string | null;
};

export type PreviewRequest = {
  documentId: string;
  workspaceOverrides?: Record<string, unknown>;
};

export type PreviewResponse = {
  documentId: string;
  kind: string;
  body: unknown;
  warnings: Array<{ severity: string; code: string; message: string }>;
};

export type TemplateContentResponse = {
  templateId: string;
  path: string;
  contentBase64: string;
  text?: string | null;
};

export type TemplateContentUpdate = {
  text?: string;
  contentBase64?: string;
};

export type TemplateLibraryKind = "document" | "starter" | "recipe";

export type RequiredBitTypeSummary = {
  /** Bit type identifier. */
  typeId: string;

  /** Human-readable bit type name. */
  name: string;
};

export type TemplateLibraryEntry = {
  id: string;
  kind: TemplateLibraryKind;
  title: string;
  description?: string | null;
  documentType?: string | null;
  driver?: string | null;
  irFamily?: string | null;
  tags?: string[];
  templateVersion?: string | null;
  requiredInputs?: string[];
  capabilities?: string[];
  path?: string | null;
  mediaType?: string | null;
  variableCount?: number | null;
  bitCount?: number | null;
  documentCount?: number | null;
  /** Required bit types for recipe entries. */
  requiredBitTypes?: RequiredBitTypeSummary[];
};

export type TemplateLibraryDetail = TemplateLibraryEntry & {
  manifest?: Record<string, unknown> | null;
  project?: Record<string, unknown> | null;
  recipe?: Record<string, unknown> | null;
};

export type TemplateLibraryListParams = {
  kind?: TemplateLibraryKind;
  documentType?: string;
  tag?: string;
};

export type RoboreanClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  getHeaders?: () => Record<string, string>;
};

async function request<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<T> {
  const response = await fetchImpl(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Thin fetch wrapper for the Roborean API. */
export function createRoboreanClient(opts: RoboreanClientOptions) {
  const fetchImpl = opts.fetch ?? fetch;
  const headers = () => ({
    "Content-Type": "application/json",
    ...(opts.getHeaders?.() ?? {}),
  });
  return {
    listProjects: () =>
      request<ProjectSummary[]>(
        opts.baseUrl,
        "/v1/projects",
        { headers: headers() },
        fetchImpl,
      ),
    getProject: (id: string) =>
      request<ProjectDetail>(
        opts.baseUrl,
        `/v1/projects/${id}`,
        { headers: headers() },
        fetchImpl,
      ),
    createProject: (body: ProjectCreate) =>
      request<ProjectDetail>(
        opts.baseUrl,
        "/v1/projects",
        { method: "POST", headers: headers(), body: JSON.stringify(body) },
        fetchImpl,
      ),
    updateProject: (id: string, body: ProjectUpdate) =>
      request<ProjectDetail>(
        opts.baseUrl,
        `/v1/projects/${id}`,
        { method: "PUT", headers: headers(), body: JSON.stringify(body) },
        fetchImpl,
      ),
    deleteProject: (id: string) =>
      request<void>(
        opts.baseUrl,
        `/v1/projects/${id}`,
        { method: "DELETE", headers: headers() },
        fetchImpl,
      ),
    createRun: (id: string, body: RunCreate, idempotencyKey: string) =>
      request<RunDetail>(
        opts.baseUrl,
        `/v1/projects/${id}/runs`,
        {
          method: "POST",
          headers: { ...headers(), "Idempotency-Key": idempotencyKey },
          body: JSON.stringify(body),
        },
        fetchImpl,
      ),
    getRun: (runId: string) =>
      request<RunDetail>(
        opts.baseUrl,
        `/v1/runs/${runId}`,
        { headers: headers() },
        fetchImpl,
      ),
    listRuns: (projectId: string) =>
      request<RunSummary[]>(
        opts.baseUrl,
        `/v1/projects/${projectId}/runs`,
        { headers: headers() },
        fetchImpl,
      ),
    previewDocument: (projectId: string, body: PreviewRequest) =>
      request<PreviewResponse>(
        opts.baseUrl,
        `/v1/projects/${projectId}/preview`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(body),
        },
        fetchImpl,
      ),
    getTemplateContent: (projectId: string, templateId: string) =>
      request<TemplateContentResponse>(
        opts.baseUrl,
        `/v1/projects/${projectId}/templates/${templateId}/content`,
        { headers: headers() },
        fetchImpl,
      ),
    putTemplateContent: (
      projectId: string,
      templateId: string,
      body: TemplateContentUpdate,
    ) =>
      request<TemplateContentResponse>(
        opts.baseUrl,
        `/v1/projects/${projectId}/templates/${templateId}/content`,
        {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify(body),
        },
        fetchImpl,
      ),
    deleteTemplateContent: (projectId: string, templateId: string) =>
      request<void>(
        opts.baseUrl,
        `/v1/projects/${projectId}/templates/${templateId}/content`,
        { method: "DELETE", headers: headers() },
        fetchImpl,
      ),
    listTemplateLibrary: (params: TemplateLibraryListParams = {}) => {
      const search = new URLSearchParams();
      if (params.kind) {
        search.set("kind", params.kind);
      }
      if (params.documentType) {
        search.set("documentType", params.documentType);
      }
      if (params.tag) {
        search.set("tag", params.tag);
      }
      const query = search.toString();
      const suffix = query ? `?${query}` : "";
      return request<TemplateLibraryEntry[]>(
        opts.baseUrl,
        `/v1/template-library${suffix}`,
        { headers: headers() },
        fetchImpl,
      );
    },
    getTemplateLibraryEntry: (entryId: string) =>
      request<TemplateLibraryDetail>(
        opts.baseUrl,
        `/v1/template-library/${entryId}`,
        { headers: headers() },
        fetchImpl,
      ),
    getTemplateLibraryContent: (entryId: string) =>
      request<TemplateContentResponse>(
        opts.baseUrl,
        `/v1/template-library/${entryId}/content`,
        { headers: headers() },
        fetchImpl,
      ),
    artifactDownloadUrl: (runId: string, artifactId: string) =>
      `${opts.baseUrl}/v1/runs/${runId}/artifacts/${artifactId}`,
    downloadArtifact: async (runId: string, artifactId: string) => {
      const response = await fetchImpl(
        `${opts.baseUrl}/v1/runs/${runId}/artifacts/${artifactId}`,
        { headers: opts.getHeaders?.() ?? {} },
      );
      if (!response.ok) {
        throw new Error(`${response.status} ${await response.text()}`);
      }
      return response.blob();
    },
  };
}
