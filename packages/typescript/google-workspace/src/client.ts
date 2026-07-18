import type { DocumentOperation } from "@roborean/documents-base";
import { compileProject, runProject } from "@roborean/engine";
import type { Project } from "@roborean/spec";
import { applyOpsToGoogleDoc } from "./docsDriver.js";
import { GoogleWorkspaceError, NotFoundError } from "./errors.js";
import { projectFolderName, ROBOREAN_FOLDER_NAME } from "./layout.js";
import { SheetsProjectRepository } from "./repositories/projects.js";
import { SheetsRunRepository } from "./repositories/runs.js";
import { newId } from "./serialize.js";
import type { GoogleApis, WorkspaceBinding } from "./types.js";

/**
 * Create-run options accepted by the Google Workspace client.
 */
export type GoogleRunCreate = {
  /**
   * When true, skip Google Doc writes.
   */
  dryRun?: boolean;

  /**
   * Stop after the first bit failure when true.
   */
  stopOnBitError?: boolean;

  /**
   * Optional workspace overrides (ignored in v1 browser mode).
   */
  workspaceOverrides?: Record<string, unknown>;
};

/**
 * Options for creating a Google Workspace storage client.
 */
export type GoogleWorkspaceClientOptions = {
  /**
   * Google API clients.
   */
  apis: GoogleApis;

  /**
   * Active Drive/Sheets binding.
   */
  binding: WorkspaceBinding;

  /**
   * Optional writer identity for lock rows.
   */
  owner?: string;

  /**
   * Optional template text lookup for document generation.
   *
   * @param projectId - Project identifier.
   * @param templateId - Template identifier.
   * @returns Template text or null.
   */
  getTemplateText?: (
    projectId: string,
    templateId: string,
  ) => Promise<string | null>;
};

/**
 * Browser storage client with a Roborean API-compatible surface.
 *
 * @param options - Client configuration.
 * @returns Client methods used by apps/web and the editor.
 */
export function createGoogleWorkspaceClient(
  options: GoogleWorkspaceClientOptions,
) {
  // Stable writer identity for optimistic sheet locks.
  const owner = options.owner ?? newId();
  const projects = new SheetsProjectRepository(
    options.apis,
    options.binding,
    owner,
  );
  const runs = new SheetsRunRepository(options.apis, options.binding, owner);

  // Local template content cache for browser-only mode.
  const templateTexts = new Map<string, string>();

  /**
   * Build a template cache key.
   *
   * @param projectId - Project identifier.
   * @param templateId - Template identifier.
   * @returns Cache key.
   */
  function templateKey(projectId: string, templateId: string): string {
    return `${projectId}:${templateId}`;
  }

  return {
    /**
     * List project summaries from the companion sheet.
     *
     * @returns Project summaries.
     */
    listProjects: () => projects.listSummaries(),

    /**
     * Load one project document.
     *
     * @param id - Project identifier.
     * @returns Project detail envelope.
     */
    getProject: async (id: string) => ({
      project: await projects.get(id),
    }),

    /**
     * Create a project document.
     *
     * @param body - Create payload.
     * @returns Created project detail.
     */
    createProject: async (body: { project: object }) => {
      const project = body.project as Project;
      await projects.save(project);
      return { project };
    },

    /**
     * Update a project document.
     *
     * @param id - Project identifier.
     * @param body - Update payload.
     * @returns Updated project detail.
     */
    updateProject: async (id: string, body: { project: object }) => {
      const project = body.project as Project;
      if (project.id !== id) {
        throw new GoogleWorkspaceError("project id mismatch");
      }
      await projects.save(project);
      return { project };
    },

    /**
     * Delete a project document.
     *
     * @param id - Project identifier.
     */
    deleteProject: (id: string) => projects.delete(id),

    /**
     * Compile and run a project locally, optionally writing Google Docs.
     *
     * @param id - Project identifier.
     * @param body - Run options.
     * @param idempotencyKey - Client idempotency key.
     * @returns Run detail envelope.
     */
    createRun: async (
      id: string,
      body: GoogleRunCreate,
      idempotencyKey: string,
    ) => {
      const existing = await runs.getByIdempotency(id, idempotencyKey);
      if (existing) {
        return {
          runId: existing.runId,
          projectId: existing.projectId,
          status: existing.status,
          results: existing.payload.results ?? null,
          diff: existing.payload.diff ?? null,
          error: existing.payload.error ?? null,
        };
      }

      const project = await projects.get(id);
      const compiled = compileProject(project);
      const results = runProject(compiled, project, {
        dryRun: body.dryRun,
        stopOnBitError: body.stopOnBitError,
      });

      // Collect document ops emitted by successful bits.
      const opsByDocument = new Map<string, DocumentOperation[]>();
      for (const bitResult of results.bitResults) {
        for (const op of bitResult.documentOps) {
          if (!op || typeof op !== "object") {
            continue;
          }
          const documentOp = op as DocumentOperation;
          const list = opsByDocument.get(documentOp.documentId) ?? [];
          list.push(documentOp);
          opsByDocument.set(documentOp.documentId, list);
        }
      }

      const artifacts: Array<{
        documentId: string;
        path: string;
        mediaType: string;
        fileId?: string;
        webViewLink?: string;
      }> = [];

      if (!body.dryRun && opsByDocument.size > 0) {
        const roborean = await options.apis.drive.findChild(
          options.binding.rootFolderId,
          ROBOREAN_FOLDER_NAME,
          "application/vnd.google-apps.folder",
        );
        if (!roborean) {
          throw new GoogleWorkspaceError("Roborean folder missing");
        }

        let projectFolder = await options.apis.drive.findChild(
          roborean.id,
          projectFolderName(id),
          "application/vnd.google-apps.folder",
        );
        if (!projectFolder) {
          projectFolder = await options.apis.drive.createFolder(
            projectFolderName(id),
            roborean.id,
          );
        }

        for (const [documentId, ops] of opsByDocument) {
          const definition = project.documents.find(
            (document) => document.id === documentId,
          );
          const title = definition?.title ?? documentId;
          const created = await options.apis.drive.createDocument(
            `${title}-${results.runId.slice(0, 8)}`,
            projectFolder.id,
          );

          // Resolve optional template text for named-value replacement.
          let templateText = "";
          const templateRef =
            typeof definition?.templateRef === "string"
              ? definition.templateRef
              : "";
          if (templateRef) {
            templateText =
              templateTexts.get(templateKey(id, templateRef)) ??
              (options.getTemplateText
                ? ((await options.getTemplateText(id, templateRef)) ?? "")
                : "");
          }

          await applyOpsToGoogleDoc(
            options.apis.docs,
            created.id,
            ops,
            templateText,
          );

          artifacts.push({
            documentId,
            path: created.webViewLink ?? created.id,
            mediaType: "application/vnd.google-apps.document",
            fileId: created.id,
            webViewLink: created.webViewLink,
          });
        }

        await runs.saveDocumentRefs(
          artifacts
            .filter((artifact) => artifact.fileId && artifact.webViewLink)
            .map((artifact) => ({
              runId: results.runId,
              documentId: artifact.documentId,
              fileId: artifact.fileId as string,
              webViewLink: artifact.webViewLink as string,
              mediaType: artifact.mediaType,
            })),
        );
      }

      const payload = {
        results: { ...results, artifacts },
        diff: null,
        error: null,
      };
      const record = await runs.create({
        projectId: id,
        idempotencyKey,
        requestBody: body,
        status: results.status,
        payload,
        runId: results.runId,
      });

      // Mark finished timestamp after local execution completes.
      await runs.update({
        ...record,
        finishedAt: results.finishedAt,
        status: results.status,
        payload,
      });

      return {
        runId: results.runId,
        projectId: id,
        status: results.status,
        results: payload.results,
        diff: null,
        error: null,
      };
    },

    /**
     * Load one run detail.
     *
     * @param runId - Run identifier.
     * @returns Run detail envelope.
     */
    getRun: async (runId: string) => {
      const record = await runs.get(runId);
      return {
        runId: record.runId,
        projectId: record.projectId,
        status: record.status,
        results: record.payload.results ?? null,
        diff: record.payload.diff ?? null,
        error: record.payload.error ?? null,
      };
    },

    /**
     * List runs for a project.
     *
     * @param projectId - Project identifier.
     * @returns Run summaries.
     */
    listRuns: async (projectId: string) => {
      const rows = await runs.listForProject(projectId);
      return rows.map((row) => ({
        runId: row.runId,
        projectId: row.projectId,
        status: row.status,
        createdAt: row.createdAt,
        finishedAt: row.finishedAt ?? null,
      }));
    },

    /**
     * Browser preview is not routed through Google Docs.
     *
     * @returns Never; always throws.
     */
    previewDocument: async () => {
      throw new GoogleWorkspaceError(
        "Use local preview for browser Google Workspace mode",
      );
    },

    /**
     * Read cached template text content.
     *
     * @param projectId - Project identifier.
     * @param templateId - Template identifier.
     * @returns Template content response.
     */
    getTemplateContent: async (projectId: string, templateId: string) => {
      const text = templateTexts.get(templateKey(projectId, templateId));
      if (text == null && options.getTemplateText) {
        const loaded = await options.getTemplateText(projectId, templateId);
        if (loaded != null) {
          templateTexts.set(templateKey(projectId, templateId), loaded);
          return {
            templateId,
            path: templateId,
            contentBase64: "",
            text: loaded,
          };
        }
      }
      if (text == null) {
        throw new NotFoundError(templateId);
      }
      return {
        templateId,
        path: templateId,
        contentBase64: "",
        text,
      };
    },

    /**
     * Cache template text content locally.
     *
     * @param projectId - Project identifier.
     * @param templateId - Template identifier.
     * @param body - Template update payload.
     * @returns Updated template content response.
     */
    putTemplateContent: async (
      projectId: string,
      templateId: string,
      body: { text?: string; contentBase64?: string },
    ) => {
      let text = body.text ?? "";
      if (!text && body.contentBase64) {
        text = atob(body.contentBase64);
      }
      templateTexts.set(templateKey(projectId, templateId), text);
      return {
        templateId,
        path: templateId,
        contentBase64: body.contentBase64 ?? "",
        text,
      };
    },

    /**
     * Remove cached template text content.
     *
     * @param projectId - Project identifier.
     * @param templateId - Template identifier.
     */
    deleteTemplateContent: async (projectId: string, templateId: string) => {
      templateTexts.delete(templateKey(projectId, templateId));
    },

    /**
     * Template library is not hosted in Google Workspace mode.
     *
     * @returns Empty catalog.
     */
    listTemplateLibrary: async () => [],

    /**
     * Template library detail is unavailable in Google Workspace mode.
     *
     * @param entryId - Catalog entry id.
     */
    getTemplateLibraryEntry: async (entryId: string) => {
      throw new NotFoundError(entryId);
    },

    /**
     * Template library content is unavailable in Google Workspace mode.
     *
     * @param entryId - Catalog entry id.
     */
    getTemplateLibraryContent: async (entryId: string) => {
      throw new NotFoundError(entryId);
    },

    /**
     * Build an openable Google Docs URL for a run artifact.
     *
     * @param runId - Run identifier.
     * @param artifactId - Document identifier.
     * @returns Web view URL when known.
     */
    artifactDownloadUrl: (runId: string, artifactId: string) =>
      `gdoc://${runId}/${artifactId}`,

    /**
     * Resolve a Google Doc reference for a run artifact.
     *
     * @param runId - Run identifier.
     * @param artifactId - Document identifier.
     * @returns Blob containing the web view URL text.
     */
    downloadArtifact: async (runId: string, artifactId: string) => {
      const refs = await runs.listDocumentRefs(runId);
      const match = refs.find((ref) => ref.documentId === artifactId);
      if (!match) {
        throw new NotFoundError(artifactId);
      }
      return new Blob([match.webViewLink], { type: "text/uri-list" });
    },
  };
}

/**
 * Client type returned by createGoogleWorkspaceClient.
 */
export type GoogleWorkspaceClient = ReturnType<
  typeof createGoogleWorkspaceClient
>;
