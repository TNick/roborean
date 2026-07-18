import type { Project } from "../types/models.js";

/** Migrates supported project data to a supported canonical format. */
export function migrateProject(
  data: unknown,
  target: "1.0.0" | "1.1.0" = "1.1.0",
): Project {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Project must be an object");
  }
  const project = structuredClone(data) as Record<string, unknown>;
  const source = project.schemaVersion;
  if (source !== "1.0.0" && source !== "1.1.0") {
    throw new Error(
      `Unsupported schema version: ${String(project.schemaVersion)}`,
    );
  }
  if (source === target) {
    return project as unknown as Project;
  }
  if (source === "1.0.0" && target === "1.1.0") {
    project.schemaVersion = "1.1.0";
    return project as unknown as Project;
  }
  throw new Error(
    `Unsupported project migration from ${String(source)} to ${target}`,
  );
}
