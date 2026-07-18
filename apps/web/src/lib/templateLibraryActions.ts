import type {
  Bit,
  DocumentDefinition,
  Project,
  Variable,
} from "@roborean/spec";
import type {
  TemplateLibraryDetail,
  TemplateLibraryEntry,
} from "@roborean/api-types";

/** Client surface used by template library actions. */
export type TemplateLibraryClient = {
  getTemplateLibraryEntry: (entryId: string) => Promise<TemplateLibraryDetail>;
  getTemplateLibraryContent: (entryId: string) => Promise<{
    text?: string | null;
    contentBase64: string;
  }>;
  createProject: (body: { project: Project }) => Promise<{ project: object }>;
  getProject: (id: string) => Promise<{ project: object }>;
  updateProject: (
    id: string,
    body: { project: Project },
  ) => Promise<{ project: object }>;
  putTemplateContent: (
    projectId: string,
    templateId: string,
    body: { text?: string; contentBase64?: string },
  ) => Promise<unknown>;
};

/**
 * Build a stable project id from a display name.
 *
 * @param name - Human-readable project name.
 * @returns Dot-separated id with a short random suffix.
 */
export function projectIdFromName(name: string): string {
  // Keep letters and digits; collapse everything else to dots.
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  // Prefer a readable slug; fall back when the name is empty.
  const base = slug || "project";

  return `${base}.${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Allocate the next unused document id in a project.
 *
 * @param project - Target project document.
 * @returns Unused document id such as doc_1.
 */
function nextDocumentId(project: Project): string {
  const used = new Set(project.documents.map((document) => document.id));
  let index = project.documents.length + 1;

  while (used.has(`doc_${index}`)) {
    index += 1;
  }

  return `doc_${index}`;
}

/**
 * Allocate an unused template id in a project.
 *
 * @param project - Target project document.
 * @param preferred - Preferred template id when unused.
 * @returns Unique template id.
 */
function nextTemplateId(project: Project, preferred: string): string {
  const used = new Set(project.templates.map((template) => template.id));

  if (!used.has(preferred)) {
    return preferred;
  }

  let index = 1;

  while (used.has(`${preferred}_${index}`)) {
    index += 1;
  }

  return `${preferred}_${index}`;
}

/**
 * Derive a file extension from a library template path.
 *
 * @param path - Relative template path from the catalog entry.
 * @returns Extension including the leading dot, or empty string.
 */
function extensionFromPath(path: string): string {
  const match = /\.[^./\\]+$/.exec(path);
  return match?.[0] ?? "";
}

/**
 * Create a project from a starter catalog entry.
 *
 * @param client - Roborean API client.
 * @param entry - Starter catalog entry.
 * @returns Created project id.
 */
export async function useProjectStarter(
  client: TemplateLibraryClient,
  entry: TemplateLibraryEntry,
): Promise<string> {
  const detail = (await client.getTemplateLibraryEntry(
    entry.id,
  )) as TemplateLibraryDetail;
  const starter = detail.project as Project | undefined;

  if (!starter) {
    throw new Error("Starter payload is missing from the catalog entry");
  }

  // Assign a fresh stored project id while keeping the starter body.
  const project: Project = {
    ...starter,
    id: projectIdFromName(starter.name || entry.title),
  };

  const created = await client.createProject({ project });
  const createdProject = created.project as Project;
  const projectId = createdProject.id;

  // Upload starter template bytes through the library content endpoint.
  for (const template of createdProject.templates) {
    const libraryId = templateLibraryIdForTemplate(template.id, entry.id);
    const content = await client.getTemplateLibraryContent(libraryId);
    await client.putTemplateContent(projectId, template.id, {
      text: content.text ?? undefined,
      contentBase64: content.contentBase64,
    });
  }

  return projectId;
}

/**
 * Resolve which global library entry supplies bytes for a starter template.
 *
 * @param templateId - Template id declared by the starter project.
 * @param starterId - Starter catalog entry id.
 * @returns Library entry id whose content endpoint should be used.
 */
function templateLibraryIdForTemplate(
  templateId: string,
  starterId: string,
): string {
  if (starterId === "text-hello" && templateId === "hello") {
    return "hello";
  }

  return templateId;
}

/**
 * Import one document template catalog entry into an existing project.
 *
 * @param client - Roborean API client.
 * @param projectId - Target stored project id.
 * @param entry - Document catalog entry.
 * @returns Updated project id.
 */
export async function importDocumentTemplate(
  client: TemplateLibraryClient,
  projectId: string,
  entry: TemplateLibraryEntry,
): Promise<string> {
  const detail = await client.getTemplateLibraryEntry(entry.id);
  const fetched = await client.getProject(projectId);
  const project = fetched.project as Project;

  const documentId = nextDocumentId(project);
  const templateId = nextTemplateId(project, entry.id);
  const extension = extensionFromPath(entry.path ?? "");
  const templatePath = `templates/${templateId}${extension}`;

  const document: DocumentDefinition = {
    id: documentId,
    title: entry.title,
    type: entry.documentType ?? "text",
    driver: entry.driver ?? "roborean.text",
    templateRef: templateId,
    outputTarget: `${templateId}${extension}`,
    irFamily: entry.irFamily ?? undefined,
    settings: {},
    preview: {
      mode:
        entry.documentType === "text"
          ? "text"
          : entry.documentType === "markdown"
            ? "html"
            : "none",
      enabled: true,
    },
  };

  if (entry.description) {
    document.description = entry.description;
  }

  const updated: Project = {
    ...project,
    documents: [...project.documents, document],
    templates: [...project.templates, { id: templateId, path: templatePath }],
  };

  await client.updateProject(projectId, { project: updated });

  const content = await client.getTemplateLibraryContent(entry.id);
  await client.putTemplateContent(projectId, templateId, {
    text: content.text ?? undefined,
    contentBase64: content.contentBase64,
  });

  return projectId;
}

/** Recipe merge policy copied from the recipe envelope. */
type RecipeInsertPolicy = {
  onVariableConflict: "keep-existing" | "rename";
  onDocumentConflict: "keep-existing" | "remap";
  onBitIdConflict: "rename";
};

/** Portable recipe payload returned by the library detail endpoint. */
type RecipePayload = {
  workspace: { variables: Variable[] };
  documents: DocumentDefinition[];
  templates: Array<{ id: string; path: string }>;
  templateContents?: Record<string, string>;
  bits: Bit[];
  pluginRequirements: Project["pluginRequirements"];
  insertPolicy: RecipeInsertPolicy;
};

/**
 * Rename one variable key inside a bit config/read/write/emits list.
 *
 * @param bit - Bit to rewrite.
 * @param remap - Old key to new key mapping.
 * @returns Bit with updated references.
 */
function rewriteBitVariableRefs(bit: Bit, remap: Record<string, string>): Bit {
  const mapKey = (key: string) => remap[key] ?? key;

  const config = { ...bit.config } as Record<string, unknown>;
  if (typeof config.key === "string") {
    config.key = mapKey(config.key);
  }
  if (typeof config.from === "string") {
    config.from = mapKey(config.from);
  }
  if (typeof config.to === "string") {
    config.to = mapKey(config.to);
  }
  if (typeof config.fromKey === "string") {
    config.fromKey = mapKey(config.fromKey);
  }

  return {
    ...bit,
    config,
    reads: bit.reads.map(mapKey),
    writes: bit.writes.map(mapKey),
    emits: bit.emits.map(mapKey),
  };
}

/**
 * Import one recipe catalog entry into an existing project.
 *
 * @param client - Roborean API client.
 * @param projectId - Target stored project id.
 * @param entry - Recipe catalog entry.
 * @returns Updated project id.
 */
export async function importRecipe(
  client: TemplateLibraryClient,
  projectId: string,
  entry: TemplateLibraryEntry,
): Promise<string> {
  const detail = (await client.getTemplateLibraryEntry(
    entry.id,
  )) as TemplateLibraryDetail;
  const recipe = detail.recipe as RecipePayload | undefined;

  if (!recipe) {
    throw new Error("Recipe payload is missing from the catalog entry");
  }

  const fetched = await client.getProject(projectId);
  const project = fetched.project as Project;
  const policy = recipe.insertPolicy;

  const existingVariableKeys = new Set(
    project.workspace.variables.map((variable) => variable.key),
  );
  const variableRemap: Record<string, string> = {};
  const mergedVariables = [...project.workspace.variables];

  for (const variable of recipe.workspace.variables) {
    if (!existingVariableKeys.has(variable.key)) {
      mergedVariables.push(variable);
      existingVariableKeys.add(variable.key);
      continue;
    }

    if (policy.onVariableConflict === "keep-existing") {
      continue;
    }

    let candidate = `${variable.key}_import`;
    let suffix = 2;

    while (existingVariableKeys.has(candidate)) {
      candidate = `${variable.key}_import_${suffix}`;
      suffix += 1;
    }

    variableRemap[variable.key] = candidate;
    mergedVariables.push({ ...variable, key: candidate });
    existingVariableKeys.add(candidate);
  }

  const existingDocumentIds = new Set(
    project.documents.map((document) => document.id),
  );
  const documentRemap: Record<string, string> = {};
  const mergedDocuments = [...project.documents];
  const mergedTemplates = [...project.templates];

  for (const document of recipe.documents) {
    if (!existingDocumentIds.has(document.id)) {
      mergedDocuments.push(document);
      existingDocumentIds.add(document.id);
      continue;
    }

    if (policy.onDocumentConflict === "keep-existing") {
      continue;
    }

    const remappedId = nextDocumentId({
      ...project,
      documents: mergedDocuments,
    });
    documentRemap[document.id] = remappedId;
    mergedDocuments.push({
      ...document,
      id: remappedId,
      templateRef: nextTemplateId(project, document.templateRef),
    });
    existingDocumentIds.add(remappedId);
  }

  for (const template of recipe.templates) {
    if (!mergedTemplates.some((row) => row.id === template.id)) {
      mergedTemplates.push(template);
    }
  }

  const existingBitIds = new Set(project.bits.map((bit) => bit.id));
  const mergedBits = [...project.bits];

  for (const bit of recipe.bits) {
    let nextBit = rewriteBitVariableRefs(bit, variableRemap);
    const config = { ...nextBit.config } as Record<string, unknown>;

    if (typeof config.documentId === "string") {
      config.documentId = documentRemap[config.documentId] ?? config.documentId;
    }

    nextBit = {
      ...nextBit,
      config,
      emits: nextBit.emits.map((emit) => documentRemap[emit] ?? emit),
    };

    if (existingBitIds.has(nextBit.id)) {
      let candidate = `${nextBit.id}_import`;
      let suffix = 2;

      while (existingBitIds.has(candidate)) {
        candidate = `${nextBit.id}_import_${suffix}`;
        suffix += 1;
      }

      nextBit = { ...nextBit, id: candidate };
    }

    existingBitIds.add(nextBit.id);
    mergedBits.push(nextBit);
  }

  const pluginNames = new Set(
    project.pluginRequirements.map((requirement) => requirement.name),
  );
  const mergedPlugins = [...project.pluginRequirements];

  for (const requirement of recipe.pluginRequirements) {
    if (!pluginNames.has(requirement.name)) {
      mergedPlugins.push(requirement);
      pluginNames.add(requirement.name);
    }
  }

  const updated: Project = {
    ...project,
    workspace: { variables: mergedVariables },
    documents: mergedDocuments,
    templates: mergedTemplates,
    bits: mergedBits,
    pluginRequirements: mergedPlugins,
  };

  await client.updateProject(projectId, { project: updated });

  if (recipe.templateContents) {
    for (const [templateId, body] of Object.entries(recipe.templateContents)) {
      await client.putTemplateContent(projectId, templateId, { text: body });
    }
  }

  return projectId;
}
