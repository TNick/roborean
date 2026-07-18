import type { ChangeEvent } from "react";
import type { DocumentDefinition, Project } from "@roborean/spec";
import MenuItem from "@mui/material/MenuItem";
import { FormStack, FormTextField } from "@roborean/ui";

import {
  DocumentTemplatePanel,
  type GoogleDocTemplateHostActions,
} from "./DocumentTemplatePanel.js";

/**
 * Props for the document definition form.
 */
export type DocumentFormProps = {
  /** Document definition being edited. */
  document: DocumentDefinition;

  /** Project owning templates and document metadata. */
  project: Project;

  /** Stored project id for template API calls, when available. */
  projectId?: string;

  /**
   * Called when the user changes the document.
   *
   * @param next - Updated document definition.
   */
  onChange: (next: DocumentDefinition) => void;

  /**
   * Called when the project document changes (template table or fork).
   *
   * @param next - Updated project.
   */
  onProjectChange: (next: Project) => void;

  /**
   * Read template body text for a template id.
   *
   * @param templateId - Template identifier.
   * @returns Template text or empty string when unknown.
   */
  getTemplateText: (templateId: string) => string;

  /**
   * Persist template body text after a copy-on-write fork or edit.
   *
   * @param templateId - Template identifier.
   * @param text - Updated template body.
   * @returns Promise that settles when content is stored locally.
   */
  setTemplateText: (templateId: string, text: string) => Promise<void>;

  /**
   * Upload binary template bytes after a copy-on-write fork.
   *
   * @param templateId - Template identifier.
   * @param bytes - Raw template file bytes.
   * @returns Promise that settles when content is stored locally.
   */
  setTemplateBytes: (templateId: string, bytes: ArrayBuffer) => Promise<void>;

  /**
   * Queue deletion of a forked template file on save.
   *
   * @param templateId - Template identifier to remove from storage.
   */
  onTemplateDelete?: (templateId: string) => void;

  /** Optional Google Doc template actions from the host app. */
  googleDocTemplate?: GoogleDocTemplateHostActions;
};

const PREVIEW_MODES = ["text", "html", "json", "drawing-json"] as const;

/**
 * Read a string field from a document definition.
 *
 * @param document - Document definition.
 * @param key - Field name.
 * @returns String value or empty string.
 */
function stringField(document: DocumentDefinition, key: string): string {
  const value = document[key];
  return typeof value === "string" ? value : "";
}

/**
 * Read preview settings from a document definition.
 *
 * @param document - Document definition.
 * @returns Preview mode and enabled flag.
 */
function previewFields(document: DocumentDefinition): {
  mode: string;
  enabled: boolean;
} {
  const preview = document.preview;
  if (!preview || typeof preview !== "object") {
    return { mode: "text", enabled: true };
  }
  const record = preview as Record<string, unknown>;
  return {
    mode: typeof record.mode === "string" ? record.mode : "text",
    enabled: record.enabled !== false,
  };
}

/**
 * Structured editor for one document definition.
 *
 * @param props - Document and change handler.
 * @returns Document form UI.
 */
export function DocumentForm({
  document,
  project,
  projectId,
  onChange,
  onProjectChange,
  getTemplateText,
  setTemplateText,
  setTemplateBytes,
  onTemplateDelete,
  googleDocTemplate,
}: DocumentFormProps) {
  const preview = previewFields(document);

  return (
    <FormStack>
      <FormTextField
        size="small"
        label="Title"
        value={stringField(document, "title") || document.id}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({ ...document, title: event.target.value })
        }
      />
      <FormTextField
        size="small"
        label="Description"
        value={stringField(document, "description")}
        multiline
        minRows={2}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const description = event.target.value;
          const next: DocumentDefinition = { ...document, description };
          if (!description.trim()) {
            delete next.description;
          }
          onChange(next);
        }}
      />
      <FormTextField
        size="small"
        label="Type"
        value={stringField(document, "type")}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({ ...document, type: event.target.value })
        }
      />
      <FormTextField
        size="small"
        label="Driver"
        value={stringField(document, "driver")}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({ ...document, driver: event.target.value })
        }
      />
      <DocumentTemplatePanel
        project={project}
        document={document}
        projectId={projectId}
        onDocumentChange={onChange}
        onProjectChange={onProjectChange}
        getTemplateText={getTemplateText}
        setTemplateText={setTemplateText}
        setTemplateBytes={setTemplateBytes}
        onTemplateDelete={onTemplateDelete}
        googleDocTemplate={googleDocTemplate}
      />
      <FormTextField
        size="small"
        label="Output target"
        value={stringField(document, "outputTarget")}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({ ...document, outputTarget: event.target.value })
        }
      />
      <FormTextField
        select
        size="small"
        label="Preview mode"
        value={preview.mode}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({
            ...document,
            preview: {
              ...((document.preview as Record<string, unknown>) ?? {}),
              mode: event.target.value,
              enabled: preview.enabled,
            },
          })
        }
      >
        {PREVIEW_MODES.map((mode) => (
          <MenuItem key={mode} value={mode}>
            {mode}
          </MenuItem>
        ))}
      </FormTextField>
      <FormTextField
        select
        size="small"
        label="Preview enabled"
        value={preview.enabled ? "yes" : "no"}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({
            ...document,
            preview: {
              ...((document.preview as Record<string, unknown>) ?? {}),
              mode: preview.mode,
              enabled: event.target.value === "yes",
            },
          })
        }
      >
        <MenuItem value="yes">yes</MenuItem>
        <MenuItem value="no">no</MenuItem>
      </FormTextField>
    </FormStack>
  );
}
