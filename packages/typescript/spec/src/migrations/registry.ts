import type { Project } from "../types/models.js";

/** Migrates supported project data to a supported canonical format. */
export function migrateProject(data: unknown): Project {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Project must be an object");
  }
  const project = structuredClone(data) as Record<string, unknown>;
  if (
    project.schemaVersion !== "1.0.0" &&
    project.schemaVersion !== "1.1.0"
  ) {
    throw new Error(
      `Unsupported schema version: ${String(project.schemaVersion)}`,
    );
  }
  return project as unknown as Project;
}
