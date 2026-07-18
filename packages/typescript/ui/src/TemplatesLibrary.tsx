import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";

import { CollapsibleSearchField } from "./CollapsibleSearchField.js";
import {
  documentTypeFilters,
  filterTemplateLibraryEntries,
  recipeTagFilters,
  type TemplateLibraryEntry,
  type TemplateLibraryKind,
  type TemplatesLibraryProps,
} from "./templatesLibraryTypes.js";

/** Tab labels keyed by catalog kind. */
const TAB_LABELS: Record<TemplateLibraryKind, string> = {
  document: "Document templates",
  starter: "Project starters",
  recipe: "Recipes",
};

/**
 * Three-tab catalog browser for document templates, starters, and recipes.
 *
 * @param props - Catalog data and action callbacks.
 * @returns Templates library element.
 */
export function TemplatesLibrary({
  entries,
  loading = false,
  error = null,
  busyIds = [],
  onImportDocument,
  onUseProjectStarter,
  onImportRecipe,
}: TemplatesLibraryProps) {
  // Active catalog tab kind.
  const [activeTab, setActiveTab] = useState<TemplateLibraryKind>("document");

  // Free-text search query shared across tabs.
  const [searchQuery, setSearchQuery] = useState("");

  // Optional document-type chip filter on the documents tab.
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string | null>(
    null,
  );

  // Optional tag chip filter on the recipes tab.
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Entries visible on the active tab before chip filters.
  const tabEntries = useMemo(
    () => filterTemplateLibraryEntries(entries, activeTab, searchQuery),
    [activeTab, entries, searchQuery],
  );

  // Document type chips derived from the full catalog.
  const documentTypes = useMemo(() => documentTypeFilters(entries), [entries]);

  // Recipe tag chips derived from the full catalog.
  const recipeTags = useMemo(() => recipeTagFilters(entries), [entries]);

  // Apply chip filters after the text search.
  const visibleEntries = useMemo(() => {
    if (activeTab === "document" && documentTypeFilter) {
      return tabEntries.filter(
        (entry) => entry.documentType === documentTypeFilter,
      );
    }
    if (activeTab === "recipe" && tagFilter) {
      return tabEntries.filter((entry) =>
        (entry.tags ?? []).includes(tagFilter),
      );
    }
    return tabEntries;
  }, [activeTab, documentTypeFilter, tabEntries, tagFilter]);

  /**
   * Render the primary action button for one catalog row.
   *
   * @param entry - Catalog entry row.
   * @returns Action button element or null when no handler is wired.
   */
  function renderAction(entry: TemplateLibraryEntry) {
    const busy = busyIds.includes(entry.id);

    if (entry.kind === "document" && onImportDocument) {
      return (
        <Button
          size="small"
          variant="outlined"
          disabled={busy}
          onClick={() => onImportDocument(entry)}
        >
          {busy ? "Importing…" : "Import into project"}
        </Button>
      );
    }

    if (entry.kind === "starter" && onUseProjectStarter) {
      return (
        <Button
          size="small"
          variant="contained"
          disabled={busy}
          onClick={() => onUseProjectStarter(entry)}
        >
          {busy ? "Creating…" : "Use starter"}
        </Button>
      );
    }

    if (entry.kind === "recipe" && onImportRecipe) {
      return (
        <Button
          size="small"
          variant="outlined"
          disabled={busy}
          onClick={() => onImportRecipe(entry)}
        >
          {busy ? "Importing…" : "Import into project"}
        </Button>
      );
    }

    return null;
  }

  return (
    <Stack spacing={2}>
      <Tabs
        value={activeTab}
        onChange={(_event, value: TemplateLibraryKind) => {
          setActiveTab(value);
          setDocumentTypeFilter(null);
          setTagFilter(null);
        }}
      >
        {(Object.keys(TAB_LABELS) as TemplateLibraryKind[]).map((kind) => (
          <Tab key={kind} value={kind} label={TAB_LABELS[kind]} />
        ))}
      </Tabs>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box
            sx={{
              alignItems: "center",
              display: "flex",
              gap: 1,
              justifyContent: "space-between",
              mb: 1,
              minWidth: 0,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, minWidth: 0 }}
              noWrap
            >
              {TAB_LABELS[activeTab]}
            </Typography>
            {visibleEntries.length > 0 ? (
              <CollapsibleSearchField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={`Search ${TAB_LABELS[activeTab].toLowerCase()}`}
                ariaLabel={`Search ${TAB_LABELS[activeTab].toLowerCase()}`}
              />
            ) : null}
          </Box>
          {activeTab === "document" && documentTypes.length > 0 ? (
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
              <Chip
                label="All types"
                color={documentTypeFilter === null ? "primary" : "default"}
                onClick={() => setDocumentTypeFilter(null)}
                size="small"
              />
              {documentTypes.map((documentType) => (
                <Chip
                  key={documentType}
                  label={documentType}
                  color={
                    documentTypeFilter === documentType ? "primary" : "default"
                  }
                  onClick={() => setDocumentTypeFilter(documentType)}
                  size="small"
                />
              ))}
            </Stack>
          ) : null}

          {activeTab === "recipe" && recipeTags.length > 0 ? (
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
              <Chip
                label="All tags"
                color={tagFilter === null ? "primary" : "default"}
                onClick={() => setTagFilter(null)}
                size="small"
              />
              {recipeTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  color={tagFilter === tag ? "primary" : "default"}
                  onClick={() => setTagFilter(tag)}
                  size="small"
                />
              ))}
            </Stack>
          ) : null}

          {visibleEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No entries match the current filters.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {visibleEntries.map((entry) => (
                <Box
                  key={entry.id}
                  sx={{
                    alignItems: "flex-start",
                    display: "flex",
                    gap: 2,
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {entry.title}
                    </Typography>
                    {entry.description ? (
                      <Typography variant="body2" color="text.secondary">
                        {entry.description}
                      </Typography>
                    ) : null}
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mt: 1, flexWrap: "wrap" }}
                    >
                      {(entry.tags ?? []).map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                      {entry.documentType ? (
                        <Chip label={entry.documentType} size="small" />
                      ) : null}
                      {entry.variableCount != null ? (
                        <Chip
                          label={`${entry.variableCount} variables`}
                          size="small"
                        />
                      ) : null}
                      {entry.bitCount != null ? (
                        <Chip label={`${entry.bitCount} bits`} size="small" />
                      ) : null}
                      {(entry.requiredBitTypes ?? []).map((bitType) => (
                        <Chip
                          key={bitType.typeId}
                          label={bitType.name}
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                  {renderAction(entry)}
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
}

export type {
  TemplateLibraryEntry,
  TemplateLibraryKind,
  TemplatesLibraryProps,
} from "./templatesLibraryTypes.js";
export {
  documentTypeFilters,
  filterTemplateLibraryEntries,
  recipeTagFilters,
} from "./templatesLibraryTypes.js";
