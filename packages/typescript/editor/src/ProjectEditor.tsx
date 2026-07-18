import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type DragEvent,
} from "react";
import type { ChangeEvent, ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import type { Project } from "@roborean/spec";
import { createRoboreanClient } from "@roborean/api-types";
import type { DependencyNode } from "@roborean/validation";
import {
  Alert,
  AppToolbar,
  Button,
  DiagnosticList,
  List,
  ListItemButton,
  ListItemText,
  FormTextField,
  Panel,
  ScrollablePanelSection,
  SplitPane,
  Stack,
  Typography,
} from "@roborean/ui";
import { scrubProjectForEditor } from "@roborean/validation";
import { bitDisplayLabel } from "./utils/bitDisplayLabel.js";
import { bitTypeDisplayName } from "./utils/bitTypeDisplayName.js";
import { filterBits } from "./listFilters.js";

import { VariableForm } from "./forms/VariableForm.js";
import { DocumentForm } from "./forms/DocumentForm.js";
import { BitDetailPanel } from "./panels/BitDetailPanel.js";
import { listBitManifests } from "./bitManifestRegistry.js";
import { DependencyGraphPanel } from "./panels/DependencyGraphPanel.js";
import { DocumentsPanel } from "./panels/DocumentsPanel.js";
import { PreviewPanel } from "./panels/PreviewPanel.js";
import { RunHistoryPanel } from "./panels/RunHistoryPanel.js";
import { WorkspacePanel } from "./panels/WorkspacePanel.js";
import { createEditorStore, type EditorStore } from "./state/editorStore.js";

/**
 * Props for the main project editor surface.
 */
export type ProjectEditorProps = {
  /**
   * Initial project document to edit.
   */
  project: Project;

  /**
   * Stored project id used for server save / run calls.
   */
  projectId?: string;

  /**
   * Optional preconfigured storage/API client.
   */
  client?: Pick<
    ReturnType<typeof createRoboreanClient>,
    | "updateProject"
    | "createRun"
    | "getTemplateContent"
    | "putTemplateContent"
    | "deleteTemplateContent"
    | "listRuns"
    | "getRun"
    | "previewDocument"
  >;

  /**
   * Base URL used when `client` is omitted.
   */
  apiBaseUrl?: string;

  /**
   * Notifies the host when the in-memory project document changes.
   *
   * @param project - Latest editor project document.
   */
  onChange?: (project: Project) => void;

  /**
   * Deletes the stored project when the host supports it.
   *
   * @returns Promise that settles when delete finishes.
   */
  onDelete?: () => Promise<void> | void;

  /**
   * True while a host delete request is in flight.
   */
  deleting?: boolean;

  /**
   * Optional global toolbar actions rendered on the right of the app bar.
   */
  toolbarEnd?: ReactNode;

  /**
   * Label for the durable run action button.
   */
  runLabel?: string;
};

/**
 * Subscribe a React component to an editor store.
 *
 * @param store - Editor store instance.
 * @returns Current editor state snapshot.
 */
function useEditorStore(store: EditorStore) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/**
 * Main Roborean project editor surface.
 *
 * @param props - Editor configuration and project document.
 * @returns Editor layout with metadata, bits, and diagnostics.
 */
export function ProjectEditor({
  project,
  projectId,
  client,
  apiBaseUrl,
  onChange,
  onDelete,
  deleting = false,
  toolbarEnd,
  runLabel = "Run on server",
}: ProjectEditorProps) {
  // Recreate the store only when the host switches project identity.
  const store = useMemo(
    () => createEditorStore(scrubProjectForEditor(project)),
    [project.id],
  );
  const state = useEditorStore(store);

  // Last save failure message, if any.
  const [saveError, setSaveError] = useState<string | null>(null);

  // True while a save request is in flight.
  const [saving, setSaving] = useState(false);

  // Bit id currently dragged in the bits list.
  const [dragBitId, setDragBitId] = useState<string | null>(null);

  // Whether the add-bit type dialog is open.
  const [bitAddOpen, setBitAddOpen] = useState(false);

  // Bit type chosen in the add-bit dialog.
  const [newBitTypeId, setNewBitTypeId] = useState("roborean.noop");

  // Search query for filtering the bits list.
  const [bitsSearchQuery, setBitsSearchQuery] = useState("");

  const addableBitTypes = useMemo(
    () => listBitManifests().filter((manifest) => manifest.browserSafe),
    [],
  );

  // Whether the project metadata edit dialog is open.
  const [editOpen, setEditOpen] = useState(false);

  /**
   * Notify the host after a store mutation.
   */
  function syncProject(): void {
    onChange?.(store.getState().project);
  }

  // Prefer an injected client; otherwise build one from the base URL.
  const api =
    client ??
    (apiBaseUrl ? createRoboreanClient({ baseUrl: apiBaseUrl }) : undefined);

  // Bit currently selected in the left list, if any.
  const selectedBit = state.project.bits.find(
    (bit) => bit.id === state.selectedBitId,
  );
  const selectedBitIndex = state.project.bits.findIndex(
    (bit) => bit.id === state.selectedBitId,
  );
  const selectedDocument =
    state.project.documents.find(
      (document) => document.id === state.selectedDocumentId,
    ) ?? null;
  const selectedVariable =
    state.project.workspace.variables.find(
      (variable) => variable.key === state.selectedVariableKey,
    ) ?? null;

  /**
   * Apply a partial project update and mark the store dirty.
   *
   * @param patch - Fields to merge onto the current project.
   */
  function patchProject(patch: Partial<Project>): void {
    // Keep a single project object as the source of truth in the store.
    const next: Project = { ...state.project, ...patch };

    // Drop empty description so the document stays minimal.
    if ("description" in patch && !patch.description?.trim()) {
      delete next.description;
    }

    store.replaceProject(next);
    onChange?.(next);
  }

  /**
   * Persist the current project document through the API.
   *
   * @returns Promise that settles when save finishes.
   */
  async function saveProject(): Promise<void> {
    if (!api || !projectId) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await api.updateProject(projectId, { project: state.project });
      const pending = store.pendingTemplateSync();
      for (const templateId of pending.deletes) {
        await api.deleteTemplateContent(projectId, templateId);
      }
      for (const [templateId, entry] of Object.entries(pending.upserts)) {
        if (entry.text !== undefined) {
          await api.putTemplateContent(projectId, templateId, {
            text: entry.text,
          });
        } else if (entry.bytes) {
          const bytes = new Uint8Array(entry.bytes);
          let binary = "";
          for (const byte of bytes) {
            binary += String.fromCharCode(byte);
          }
          await api.putTemplateContent(projectId, templateId, {
            contentBase64: btoa(binary),
          });
        }
      }
      store.clearPendingTemplateSync();
      store.markSaved();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save project",
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Load template bytes for the selected document when missing locally.
   */
  useEffect(() => {
    if (!api || !projectId || !selectedDocument) {
      return;
    }
    const templateRef =
      typeof selectedDocument.templateRef === "string"
        ? selectedDocument.templateRef
        : "";
    if (!templateRef || store.getState().templateContent[templateRef]) {
      return;
    }

    void api.getTemplateContent(projectId, templateRef).then((response) => {
      if (response.text != null) {
        store.hydrateTemplateContent({
          [templateRef]: { text: response.text },
        });
        return;
      }
      const binary = atob(response.contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      store.hydrateTemplateContent({
        [templateRef]: { bytes: bytes.buffer },
      });
    });
  }, [api, projectId, selectedDocument?.id, selectedDocument?.templateRef]);

  /**
   * Jump editor selection from a dependency graph node.
   *
   * @param node - Dependency node that was clicked.
   */
  function selectGraphNode(node: DependencyNode): void {
    if (node.kind === "bit") {
      store.selectBit(node.id);
      return;
    }
    if (node.kind === "variable") {
      store.selectVariable(node.key);
      return;
    }
    store.selectDocument(node.id);
  }

  /**
   * Handle bit list drop to reorder execution order.
   *
   * @param targetIndex - Index of the row that received the drop.
   */
  function handleBitDrop(targetIndex: number): void {
    if (!dragBitId) {
      return;
    }
    store.moveBitToIndex(dragBitId, targetIndex);
    onChange?.(store.getState().project);
    setDragBitId(null);
  }

  // Display title falls back when the name field is empty.
  const title = state.project.name.trim() || "Untitled project";

  const centerTitle =
    state.focus === "variable"
      ? "Variable"
      : state.focus === "document"
        ? "Document"
        : "Bit detail";

  const filteredBits = filterBits(state.project.bits, bitsSearchQuery);
  const hasBits = state.project.bits.length > 0;

  useEffect(() => {
    if (!hasBits && bitsSearchQuery) {
      setBitsSearchQuery("");
    }
  }, [hasBits, bitsSearchQuery]);

  return (
    <Stack spacing={2}>
      <AppToolbar endActions={toolbarEnd}>
        <Typography variant="h6" component="h1" noWrap>
          {title}
        </Typography>
        <IconButton aria-label="Edit project" onClick={() => setEditOpen(true)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={() => store.recomputeLocal()}
        >
          Dry-run
        </Button>
        {api && projectId ? (
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            disabled={saving || !state.dirty || !state.project.name.trim()}
            onClick={() => void saveProject()}
          >
            Save
          </Button>
        ) : null}
        {api && projectId ? (
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={async () => {
              const run = await api.createRun(
                projectId,
                {},
                crypto.randomUUID(),
              );
              store.setServerRun(run);
            }}
          >
            {runLabel}
          </Button>
        ) : null}
        {state.dirty ? (
          <Typography variant="body2" color="text.secondary">
            Unsaved changes
          </Typography>
        ) : null}
      </AppToolbar>
      <Dialog
        open={editOpen}
        onClose={() => {
          if (!deleting) {
            setEditOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormTextField
              label="Title"
              value={state.project.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patchProject({ name: event.target.value })
              }
              fullWidth
              required
              autoFocus
            />
            <FormTextField
              label="Description"
              value={state.project.description ?? ""}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patchProject({ description: event.target.value })
              }
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          {onDelete ? (
            <Button
              color="error"
              disabled={deleting}
              onClick={() => void onDelete()}
            >
              Delete project
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={deleting} onClick={() => setEditOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={bitAddOpen}
        onClose={() => setBitAddOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add bit</DialogTitle>
        <DialogContent>
          <FormTextField
            select
            fullWidth
            size="small"
            label="Bit type"
            value={newBitTypeId}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setNewBitTypeId(event.target.value)
            }
            sx={{ mt: 1 }}
          >
            {addableBitTypes.map((manifest) => (
              <MenuItem key={manifest.typeId} value={manifest.typeId}>
                {manifest.name}
              </MenuItem>
            ))}
          </FormTextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBitAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              store.addBit(newBitTypeId);
              syncProject();
              setBitAddOpen(false);
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
      {saveError ? <Alert severity="error">{saveError}</Alert> : null}
      {!state.project.name.trim() ? (
        <Alert severity="warning">Project name is required</Alert>
      ) : null}
      <SplitPane
        left={
          <Stack spacing={2}>
            <WorkspacePanel
              project={state.project}
              selectedKey={state.selectedVariableKey}
              onSelectKey={(key) => store.selectVariable(key)}
              onAdd={() => {
                store.addVariable();
                syncProject();
              }}
              onRemove={() => {
                if (state.selectedVariableKey) {
                  store.removeVariable(state.selectedVariableKey);
                  syncProject();
                }
              }}
            />
            <Panel
              title="Bits"
              {...(hasBits
                ? {
                    searchQuery: bitsSearchQuery,
                    onSearchQueryChange: setBitsSearchQuery,
                  }
                : {})}
            >
              <ScrollablePanelSection>
                <List dense>
                  {filteredBits.map((bit) => (
                    <ListItemButton
                      key={bit.id}
                      selected={bit.id === state.selectedBitId}
                      draggable
                      onDragStart={() => setDragBitId(bit.id)}
                      onDragOver={(event: DragEvent) => event.preventDefault()}
                      onDrop={() => {
                        const targetIndex = state.project.bits.findIndex(
                          (candidate) => candidate.id === bit.id,
                        );
                        handleBitDrop(targetIndex);
                      }}
                      onClick={() => store.selectBit(bit.id)}
                    >
                      <ListItemText
                        primary={bitDisplayLabel(bit)}
                        secondary={bitTypeDisplayName(bit.type)}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </ScrollablePanelSection>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button variant="outlined" onClick={() => setBitAddOpen(true)}>
                  Add
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={!state.selectedBitId}
                  onClick={() => {
                    if (state.selectedBitId) {
                      store.removeBit(state.selectedBitId);
                      syncProject();
                    }
                  }}
                >
                  Remove
                </Button>
              </Stack>
            </Panel>
            <DocumentsPanel
              project={state.project}
              selectedDocumentId={state.selectedDocumentId}
              onSelectDocument={(id) => store.selectDocument(id)}
              onAdd={() => {
                store.addDocument();
                syncProject();
              }}
              onRemove={() => {
                if (state.selectedDocumentId) {
                  store.removeDocument(state.selectedDocumentId);
                  syncProject();
                }
              }}
            />
            {api && projectId ? (
              <Panel title="Run history">
                <RunHistoryPanel
                  projectId={projectId}
                  client={api}
                  selectedRunId={state.serverRun?.runId ?? null}
                  onSelectRun={(run) => store.setServerRun(run)}
                />
              </Panel>
            ) : null}
          </Stack>
        }
        center={
          <Panel title={centerTitle}>
            {state.focus === "variable" && selectedVariable ? (
              <VariableForm
                variable={selectedVariable}
                onChange={(next) => {
                  store.updateVariable(selectedVariable.key, next);
                  syncProject();
                }}
              />
            ) : state.focus === "document" && selectedDocument ? (
              <DocumentForm
                project={state.project}
                projectId={projectId}
                document={selectedDocument}
                getTemplateText={(templateId) =>
                  store.getTemplateText(templateId)
                }
                setTemplateText={(templateId, text) =>
                  store.setTemplateText(templateId, text)
                }
                setTemplateBytes={(templateId, bytes) =>
                  store.setTemplateBytes(templateId, bytes)
                }
                onTemplateDelete={(templateId) =>
                  store.markTemplateDeleted(templateId)
                }
                onChange={(next) => {
                  store.updateDocument(selectedDocument.id, next);
                  syncProject();
                }}
                onProjectChange={(next) => {
                  store.replaceProjectDocument(next);
                  syncProject();
                }}
              />
            ) : (
              <BitDetailPanel
                bit={selectedBit ?? null}
                bitIndex={selectedBitIndex}
                bitCount={state.project.bits.length}
                variables={state.project.workspace.variables}
                documents={state.project.documents}
                onMove={(direction) => {
                  if (selectedBit) {
                    store.reorderBit(selectedBit.id, direction);
                    syncProject();
                  }
                }}
                onChange={(next) => {
                  if (selectedBit) {
                    store.updateBit(selectedBit.id, next);
                    syncProject();
                  }
                }}
              />
            )}
          </Panel>
        }
        right={
          <Stack spacing={2}>
            <Panel title="Diagnostics">
              <ScrollablePanelSection>
                <DiagnosticList items={state.diagnostics} />
              </ScrollablePanelSection>
            </Panel>
            <Panel title="Dependencies">
              {state.graph ? (
                <DependencyGraphPanel
                  nodes={state.graph.nodes}
                  edges={state.graph.edges}
                  bitLabels={Object.fromEntries(
                    state.project.bits.map((bit) => [
                      bit.id,
                      bitDisplayLabel(bit),
                    ]),
                  )}
                  onNodeSelect={selectGraphNode}
                />
              ) : (
                <Typography variant="body2">No graph</Typography>
              )}
            </Panel>
            <Panel title="Dry-run">
              <Typography variant="body2" data-testid="dry-run-status">
                {state.localRun?.status ?? "not run"}
              </Typography>
              {state.serverRun ? (
                <Typography variant="caption">
                  Server: {state.serverRun.status}
                </Typography>
              ) : null}
            </Panel>
            <Panel title="Preview">
              <PreviewPanel
                project={state.project}
                document={selectedDocument}
                localRun={state.localRun}
                projectId={projectId}
                client={api}
                getTemplateText={(templateId) =>
                  store.getTemplateText(templateId)
                }
              />
            </Panel>
          </Stack>
        }
      />
    </Stack>
  );
}
