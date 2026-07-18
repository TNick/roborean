import { ConflictError, NotFoundError } from "../errors.js";
import { SHEET_HEADERS, SHEET_TABS } from "../layout.js";
import { withWorkspaceLock } from "../lock.js";
import {
  newId,
  parsePayload,
  requestDigest,
  serializePayload,
} from "../serialize.js";
import type {
  DocumentRefRow,
  GoogleApis,
  RunRecordRow,
  WorkspaceBinding,
} from "../types.js";

/**
 * Sheets-backed run repository with idempotency claims.
 */
export class SheetsRunRepository {
  /**
   * Google API clients.
   */
  private readonly apis: GoogleApis;

  /**
   * Active workspace binding.
   */
  private readonly binding: WorkspaceBinding;

  /**
   * Writer identity used for optimistic locks.
   */
  private readonly owner: string;

  /**
   * @param apis - Google API clients.
   * @param binding - Active workspace binding.
   * @param owner - Writer identity for locking.
   */
  constructor(apis: GoogleApis, binding: WorkspaceBinding, owner: string) {
    this.apis = apis;
    this.binding = binding;
    this.owner = owner;
  }

  /**
   * Load one run by id.
   *
   * @param runId - Run identifier.
   * @returns Stored run row.
   */
  async get(runId: string): Promise<RunRecordRow> {
    const row = (await this.readRuns()).find((item) => item.runId === runId);
    if (!row) {
      throw new NotFoundError(runId);
    }
    return row;
  }

  /**
   * List recent runs for a project, newest first.
   *
   * @param projectId - Project identifier.
   * @param limit - Maximum rows to return.
   * @returns Run rows.
   */
  async listForProject(projectId: string, limit = 50): Promise<RunRecordRow[]> {
    return (await this.readRuns())
      .filter((row) => row.projectId === projectId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  /**
   * Resolve an idempotency key when present.
   *
   * @param projectId - Project identifier.
   * @param idempotencyKey - Client key.
   * @returns Matching run or null.
   */
  async getByIdempotency(
    projectId: string,
    idempotencyKey: string,
  ): Promise<RunRecordRow | null> {
    const claims = await this.readIdempotency();
    const claim = claims.find(
      (row) =>
        row.projectId === projectId && row.idempotencyKey === idempotencyKey,
    );
    if (!claim) {
      return null;
    }
    try {
      return await this.get(claim.runId);
    } catch {
      return null;
    }
  }

  /**
   * Insert a new run and claim its idempotency key.
   *
   * @param input - Run creation fields.
   * @returns Persisted run row.
   */
  async create(input: {
    projectId: string;
    idempotencyKey: string;
    requestBody: unknown;
    status: string;
    payload: Record<string, unknown>;
    runId?: string;
  }): Promise<RunRecordRow> {
    return withWorkspaceLock(
      this.apis,
      this.binding.spreadsheetId,
      this.owner,
      async () => {
        const digest = await requestDigest(input.requestBody);
        const existing = await this.getByIdempotency(
          input.projectId,
          input.idempotencyKey,
        );
        if (existing) {
          if (existing.requestDigest !== digest) {
            throw new ConflictError(
              "idempotency key reused with a different request body",
            );
          }
          throw new ConflictError("idempotency key already exists");
        }

        const record: RunRecordRow = {
          runId: input.runId ?? newId(),
          projectId: input.projectId,
          idempotencyKey: input.idempotencyKey,
          requestDigest: digest,
          status: input.status,
          createdAt: new Date().toISOString(),
          finishedAt: null,
          rowVersion: 1,
          payload: input.payload,
        };

        const runs = await this.readRuns();
        runs.push(record);
        await this.writeRuns(runs);

        const claims = await this.readIdempotency();
        claims.push({
          projectId: record.projectId,
          idempotencyKey: record.idempotencyKey,
          runId: record.runId,
          requestDigest: record.requestDigest,
        });
        await this.writeIdempotency(claims);
        return record;
      },
    );
  }

  /**
   * Replace an existing run record.
   *
   * @param record - Updated run row.
   */
  async update(record: RunRecordRow): Promise<void> {
    await withWorkspaceLock(
      this.apis,
      this.binding.spreadsheetId,
      this.owner,
      async () => {
        const runs = await this.readRuns();
        const index = runs.findIndex((row) => row.runId === record.runId);
        if (index < 0) {
          throw new NotFoundError(record.runId);
        }
        runs[index] = {
          ...record,
          rowVersion: runs[index].rowVersion + 1,
        };
        await this.writeRuns(runs);
      },
    );
  }

  /**
   * Persist Google Doc references for a run.
   *
   * @param refs - Document reference rows.
   */
  async saveDocumentRefs(refs: DocumentRefRow[]): Promise<void> {
    if (refs.length === 0) {
      return;
    }
    await withWorkspaceLock(
      this.apis,
      this.binding.spreadsheetId,
      this.owner,
      async () => {
        const rows = await this.apis.sheets.readRows(
          this.binding.spreadsheetId,
          SHEET_TABS.documents,
        );
        const data = rows.slice(1);
        for (const ref of refs) {
          data.push([
            ref.runId,
            ref.documentId,
            ref.fileId,
            ref.webViewLink,
            ref.mediaType,
          ]);
        }
        await this.apis.sheets.writeRows(
          this.binding.spreadsheetId,
          SHEET_TABS.documents,
          [SHEET_HEADERS.documents, ...data],
        );
      },
    );
  }

  /**
   * List document references for one run.
   *
   * @param runId - Run identifier.
   * @returns Document reference rows.
   */
  async listDocumentRefs(runId: string): Promise<DocumentRefRow[]> {
    const rows = await this.apis.sheets.readRows(
      this.binding.spreadsheetId,
      SHEET_TABS.documents,
    );
    return rows
      .slice(1)
      .filter((row) => row[0] === runId)
      .map((row) => ({
        runId: row[0] ?? "",
        documentId: row[1] ?? "",
        fileId: row[2] ?? "",
        webViewLink: row[3] ?? "",
        mediaType: row[4] ?? "application/vnd.google-apps.document",
      }));
  }

  /**
   * Read and parse run rows.
   *
   * @returns Parsed run rows.
   */
  private async readRuns(): Promise<RunRecordRow[]> {
    const rows = await this.apis.sheets.readRows(
      this.binding.spreadsheetId,
      SHEET_TABS.runs,
    );
    return rows.slice(1).map((row) => ({
      runId: row[0] ?? "",
      projectId: row[1] ?? "",
      idempotencyKey: row[2] ?? "",
      requestDigest: row[3] ?? "",
      status: row[4] ?? "",
      createdAt: row[5] ?? "",
      finishedAt: row[6] || null,
      rowVersion: Number(row[7] ?? "0"),
      payload: parsePayload<Record<string, unknown>>(row[8] ?? "{}"),
    }));
  }

  /**
   * Write run rows with headers.
   *
   * @param runs - Parsed run rows.
   */
  private async writeRuns(runs: RunRecordRow[]): Promise<void> {
    await this.apis.sheets.writeRows(
      this.binding.spreadsheetId,
      SHEET_TABS.runs,
      [
        SHEET_HEADERS.runs,
        ...runs.map((row) => [
          row.runId,
          row.projectId,
          row.idempotencyKey,
          row.requestDigest,
          row.status,
          row.createdAt,
          row.finishedAt ?? "",
          String(row.rowVersion),
          serializePayload(row.payload),
        ]),
      ],
    );
  }

  /**
   * Read idempotency claim rows.
   *
   * @returns Claim rows.
   */
  private async readIdempotency(): Promise<
    Array<{
      projectId: string;
      idempotencyKey: string;
      runId: string;
      requestDigest: string;
    }>
  > {
    const rows = await this.apis.sheets.readRows(
      this.binding.spreadsheetId,
      SHEET_TABS.idempotency,
    );
    return rows.slice(1).map((row) => ({
      projectId: row[0] ?? "",
      idempotencyKey: row[1] ?? "",
      runId: row[2] ?? "",
      requestDigest: row[3] ?? "",
    }));
  }

  /**
   * Write idempotency claim rows with headers.
   *
   * @param claims - Claim rows.
   */
  private async writeIdempotency(
    claims: Array<{
      projectId: string;
      idempotencyKey: string;
      runId: string;
      requestDigest: string;
    }>,
  ): Promise<void> {
    await this.apis.sheets.writeRows(
      this.binding.spreadsheetId,
      SHEET_TABS.idempotency,
      [
        SHEET_HEADERS.idempotency,
        ...claims.map((row) => [
          row.projectId,
          row.idempotencyKey,
          row.runId,
          row.requestDigest,
        ]),
      ],
    );
  }
}
