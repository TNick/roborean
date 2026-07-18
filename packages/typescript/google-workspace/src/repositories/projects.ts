import type { Project } from "@roborean/spec";
import { ConflictError, NotFoundError } from "../errors.js";
import { SHEET_HEADERS, SHEET_TABS } from "../layout.js";
import { withWorkspaceLock } from "../lock.js";
import { parsePayload, serializePayload } from "../serialize.js";
import type { GoogleApis, WorkspaceBinding } from "../types.js";

/**
 * Sheets-backed project repository for browser Google Workspace mode.
 */
export class SheetsProjectRepository {
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
   * List stored project summaries.
   *
   * @returns Project id/name/schemaVersion rows.
   */
  async listSummaries(): Promise<
    Array<{ id: string; name: string; schemaVersion: string }>
  > {
    const rows = await this.readProjectRows();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      schemaVersion: row.schemaVersion,
    }));
  }

  /**
   * Load one project by id.
   *
   * @param projectId - Project identifier.
   * @returns Project document.
   */
  async get(projectId: string): Promise<Project> {
    const row = (await this.readProjectRows()).find(
      (item) => item.id === projectId,
    );
    if (!row) {
      throw new NotFoundError(projectId);
    }
    return row.payload;
  }

  /**
   * Load a pinned project revision.
   *
   * @param projectId - Project identifier.
   * @param revision - Revision identifier.
   * @returns Project document at that revision.
   */
  async getRevision(projectId: string, revision: string): Promise<Project> {
    const rows = await this.apis.sheets.readRows(
      this.binding.spreadsheetId,
      SHEET_TABS.revisions,
    );
    const match = rows
      .slice(1)
      .find((row) => row[0] === projectId && row[1] === revision);
    if (!match) {
      throw new NotFoundError(`${projectId}@${revision}`);
    }
    return parsePayload<Project>(match[3] ?? "{}");
  }

  /**
   * Persist a project and append a revision snapshot.
   *
   * @param project - Project document to store.
   * @param expectedRowVersion - Optional optimistic concurrency token.
   * @returns Assigned revision identifier.
   */
  async save(
    project: Project,
    expectedRowVersion?: number,
  ): Promise<{ revision: string; rowVersion: number }> {
    return withWorkspaceLock(
      this.apis,
      this.binding.spreadsheetId,
      this.owner,
      async () => {
        const rows = await this.readProjectRows();
        const index = rows.findIndex((row) => row.id === project.id);
        const existing = index >= 0 ? rows[index] : undefined;

        if (
          existing &&
          expectedRowVersion !== undefined &&
          existing.rowVersion !== expectedRowVersion
        ) {
          throw new ConflictError("project row version mismatch");
        }

        const rowVersion = (existing?.rowVersion ?? 0) + 1;
        const revision = String(rowVersion);
        const next = {
          id: project.id,
          name: project.name,
          schemaVersion: project.schemaVersion,
          rowVersion,
          updatedAt: new Date().toISOString(),
          payload: project,
        };

        if (index >= 0) {
          rows[index] = next;
        } else {
          rows.push(next);
        }

        await this.writeProjectRows(rows);
        await this.appendRevision(project.id, revision, project);
        return { revision, rowVersion };
      },
    );
  }

  /**
   * Delete a project and its revision rows.
   *
   * @param projectId - Project identifier.
   */
  async delete(projectId: string): Promise<void> {
    await withWorkspaceLock(
      this.apis,
      this.binding.spreadsheetId,
      this.owner,
      async () => {
        const rows = await this.readProjectRows();
        const next = rows.filter((row) => row.id !== projectId);
        if (next.length === rows.length) {
          throw new NotFoundError(projectId);
        }
        await this.writeProjectRows(next);

        const revisions = await this.apis.sheets.readRows(
          this.binding.spreadsheetId,
          SHEET_TABS.revisions,
        );
        const kept = revisions.slice(1).filter((row) => row[0] !== projectId);
        await this.apis.sheets.writeRows(
          this.binding.spreadsheetId,
          SHEET_TABS.revisions,
          [SHEET_HEADERS.revisions, ...kept],
        );
      },
    );
  }

  /**
   * Read and parse project data rows.
   *
   * @returns Parsed project rows.
   */
  private async readProjectRows(): Promise<
    Array<{
      id: string;
      name: string;
      schemaVersion: string;
      rowVersion: number;
      updatedAt: string;
      payload: Project;
    }>
  > {
    const rows = await this.apis.sheets.readRows(
      this.binding.spreadsheetId,
      SHEET_TABS.projects,
    );
    return rows.slice(1).map((row) => ({
      id: row[0] ?? "",
      name: row[1] ?? "",
      schemaVersion: row[2] ?? "",
      rowVersion: Number(row[3] ?? "0"),
      updatedAt: row[4] ?? "",
      payload: parsePayload<Project>(row[5] ?? "{}"),
    }));
  }

  /**
   * Write project data rows with headers.
   *
   * @param rows - Parsed project rows.
   */
  private async writeProjectRows(
    rows: Array<{
      id: string;
      name: string;
      schemaVersion: string;
      rowVersion: number;
      updatedAt: string;
      payload: Project;
    }>,
  ): Promise<void> {
    await this.apis.sheets.writeRows(
      this.binding.spreadsheetId,
      SHEET_TABS.projects,
      [
        SHEET_HEADERS.projects,
        ...rows.map((row) => [
          row.id,
          row.name,
          row.schemaVersion,
          String(row.rowVersion),
          row.updatedAt,
          serializePayload(row.payload),
        ]),
      ],
    );
  }

  /**
   * Append one revision snapshot row.
   *
   * @param projectId - Project identifier.
   * @param revision - Revision identifier.
   * @param project - Project payload.
   */
  private async appendRevision(
    projectId: string,
    revision: string,
    project: Project,
  ): Promise<void> {
    const rows = await this.apis.sheets.readRows(
      this.binding.spreadsheetId,
      SHEET_TABS.revisions,
    );
    const data = rows.slice(1);
    data.push([
      projectId,
      revision,
      new Date().toISOString(),
      serializePayload(project),
    ]);
    await this.apis.sheets.writeRows(
      this.binding.spreadsheetId,
      SHEET_TABS.revisions,
      [SHEET_HEADERS.revisions, ...data],
    );
  }
}
