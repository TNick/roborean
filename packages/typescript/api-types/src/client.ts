/** Hand-maintained API DTOs aligned with OpenAPI (regenerate via make openapi). */

export type ProjectSummary = {
  id: string;
  name: string;
  schemaVersion: string;
};

export type ProjectDetail = { project: Record<string, unknown> };

export type ProjectCreate = { project: Record<string, unknown> };

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

export type PreviewResponse = {
  documentId: string;
  kind: string;
  body: unknown;
  warnings: Array<{ severity: string; code: string; message: string }>;
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
      request<ProjectSummary[]>(opts.baseUrl, "/v1/projects", { headers: headers() }, fetchImpl),
    getProject: (id: string) =>
      request<ProjectDetail>(opts.baseUrl, `/v1/projects/${id}`, { headers: headers() }, fetchImpl),
    createProject: (body: ProjectCreate) =>
      request<ProjectDetail>(
        opts.baseUrl,
        "/v1/projects",
        { method: "POST", headers: headers(), body: JSON.stringify(body) },
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
      request<RunDetail>(opts.baseUrl, `/v1/runs/${runId}`, { headers: headers() }, fetchImpl),
  };
}
