import { useEffect, useState } from "react";
import type { Project } from "@roborean/spec";
import Chip from "@mui/material/Chip";
import {
  Button,
  List,
  ListItemButton,
  ListItemText,
  Panel,
  ScrollablePanelSection,
  Stack,
} from "@roborean/ui";

import { filterDocuments } from "../listFilters.js";
import {
  documentDisplayTitle,
  documentHasLocalTemplate,
} from "../utils/documentDisplayTitle.js";

/**
 * Props for the documents list panel.
 */
export type DocumentsPanelProps = {
  /** Project whose document definitions are listed. */
  project: Project;

  /** Selected document id, if any. */
  selectedDocumentId: string | null;

  /**
   * Called when the user selects a document row.
   *
   * @param documentId - Selected document definition id.
   */
  onSelectDocument: (documentId: string) => void;

  /** Add a new document definition. */
  onAdd: () => void;

  /** Remove the selected document, when one is selected. */
  onRemove: () => void;
};

/**
 * Lists document definitions and preview capability hints.
 *
 * @param props - Panel inputs and selection handler.
 * @returns Documents list UI.
 */
export function DocumentsPanel({
  project,
  selectedDocumentId,
  onSelectDocument,
  onAdd,
  onRemove,
}: DocumentsPanelProps) {
  // Local search query for filtering the document list.
  const [searchQuery, setSearchQuery] = useState("");
  const hasDocuments = project.documents.length > 0;

  useEffect(() => {
    if (!hasDocuments && searchQuery) {
      setSearchQuery("");
    }
  }, [hasDocuments, searchQuery]);

  const documents = filterDocuments(project.documents, searchQuery);

  return (
    <Panel
      title="Documents"
      {...(hasDocuments
        ? { searchQuery, onSearchQueryChange: setSearchQuery }
        : {})}
    >
      <Stack spacing={1}>
        <ScrollablePanelSection>
          <List dense>
            {documents.map((document) => (
              <ListItemButton
                key={document.id}
                selected={document.id === selectedDocumentId}
                onClick={() => onSelectDocument(document.id)}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{documentDisplayTitle(document)}</span>
                      {documentHasLocalTemplate(document) ? (
                        <Chip size="small" color="warning" label="Edited" />
                      ) : null}
                    </Stack>
                  }
                  secondary={`${document.type} · ${document.driver}`}
                />
              </ListItemButton>
            ))}
          </List>
        </ScrollablePanelSection>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onAdd}>
            Add
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!selectedDocumentId}
            onClick={onRemove}
          >
            Remove
          </Button>
        </Stack>
      </Stack>
    </Panel>
  );
}
