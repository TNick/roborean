import { useMemo, useState, type ReactNode } from "react";
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
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

import { CollapsibleSearchField } from "./CollapsibleSearchField.js";
import {
  documentTypeFilters,
  filterTemplateLibraryEntries,
  recipeTagFilters,
  type TemplateLibraryEntry,
  type TemplateLibraryKind,
  type TemplatesLibraryProps,
} from "./templatesLibraryTypes.js";

/** Catalog section labels keyed by entry kind. */
const KIND_LABELS: Record<TemplateLibraryKind, string> = {
  document: "Document templates",
  starter: "Project starters",
  recipe: "Recipes",
};

/** Ordered catalog kinds shown as cards or tabs. */
const CATALOG_KINDS: TemplateLibraryKind[] = ["document", "starter", "recipe"];

/**
 * Props for one catalog kind panel (card or active tab body).
 */
interface CatalogKindPanelProps {
  /** Catalog kind rendered by this panel. */
  kind: TemplateLibraryKind;

  /** Full catalog list; filtered inside the panel. */
  entries: TemplateLibraryEntry[];

  /** Entry ids with in-flight actions. */
  busyIds: string[];

  /**
   * Called when the user imports a document template into a project.
   *
   * @param entry - Selected document catalog entry.
   */
  onImportDocument?: (entry: TemplateLibraryEntry) => void;

  /**
   * Called when the user creates a project from a starter entry.
   *
   * @param entry - Selected starter catalog entry.
   */
  onUseProjectStarter?: (entry: TemplateLibraryEntry) => void;

  /**
   * Called when the user imports a recipe into a project.
   *
   * @param entry - Selected recipe catalog entry.
   */
  onImportRecipe?: (entry: TemplateLibraryEntry) => void;
}

/**
 * One kind’s search, filters, and entry list inside an outlined card.
 *
 * @param props - Kind, catalog data, and action callbacks.
 * @returns Catalog kind panel element.
 */
function CatalogKindPanel({
  kind,
  entries,
  busyIds,
  onImportDocument,
  onUseProjectStarter,
  onImportRecipe,
}: CatalogKindPanelProps) {
  // Free-text search for this kind only.
  const [searchQuery, setSearchQuery] = useState("");

  // Optional document-type chip filter (documents only).
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string | null>(
    null,
  );

  // Optional tag chip filter (recipes only).
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Entries for this kind after text search.
  const kindEntries = useMemo(
    () => filterTemplateLibraryEntries(entries, kind, searchQuery),
    [entries, kind, searchQuery],
  );

  // Document type chips derived from the full catalog.
  const documentTypes = useMemo(() => documentTypeFilters(entries), [entries]);

  // Recipe tag chips derived from the full catalog.
  const recipeTags = useMemo(() => recipeTagFilters(entries), [entries]);

  // Apply chip filters after the text search.
  const visibleEntries = useMemo(() => {
    if (kind === "document" && documentTypeFilter) {
      return kindEntries.filter(
        (entry) => entry.documentType === documentTypeFilter,
      );
    }

    if (kind === "recipe" && tagFilter) {
      return kindEntries.filter((entry) =>
        (entry.tags ?? []).includes(tagFilter),
      );
    }

    return kindEntries;
  }, [documentTypeFilter, kind, kindEntries, tagFilter]);

  /**
   * Render the primary action button for one catalog row.
   *
   * @param entry - Catalog entry row.
   * @returns Action button element or null when no handler is wired.
   */
  function renderAction(entry: TemplateLibraryEntry): ReactNode {
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
          data-testid={`use-starter-${entry.id}`}
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
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        p: 2,
      }}
    >
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
          component="h2"
          variant="subtitle1"
          sx={{ fontWeight: 600, minWidth: 0 }}
          noWrap
        >
          {KIND_LABELS[kind]}
        </Typography>
        {visibleEntries.length > 0 || searchQuery ? (
          <CollapsibleSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={`Search ${KIND_LABELS[kind].toLowerCase()}`}
            ariaLabel={`Search ${KIND_LABELS[kind].toLowerCase()}`}
          />
        ) : null}
      </Box>

      {kind === "document" && documentTypes.length > 0 ? (
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

      {kind === "recipe" && recipeTags.length > 0 ? (
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
  );
}

/**
 * Catalog browser for document templates, starters, and recipes.
 *
 * Wide viewports show three side-by-side cards; narrower viewports use tabs.
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
  const theme = useTheme();

  // Side-by-side cards from md up; tabs when the viewport is tighter.
  const useCardLayout = useMediaQuery(theme.breakpoints.up("md"), {
    noSsr: true,
  });

  // Active catalog tab kind (narrow layout only).
  const [activeTab, setActiveTab] = useState<TemplateLibraryKind>("document");

  /**
   * Build one kind panel with shared action wiring.
   *
   * @param kind - Catalog kind to render.
   * @returns Kind panel element.
   */
  function renderKindPanel(kind: TemplateLibraryKind) {
    return (
      <CatalogKindPanel
        key={kind}
        kind={kind}
        entries={entries}
        busyIds={busyIds}
        onImportDocument={onImportDocument}
        onUseProjectStarter={onUseProjectStarter}
        onImportRecipe={onImportRecipe}
      />
    );
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : useCardLayout ? (
        <Box
          sx={{
            alignItems: "stretch",
            display: "flex",
            flexDirection: "row",
            gap: 2,
            minWidth: 0,
          }}
        >
          {CATALOG_KINDS.map((kind) => (
            <Box key={kind} sx={{ display: "flex", flex: 1, minWidth: 0 }}>
              {renderKindPanel(kind)}
            </Box>
          ))}
        </Box>
      ) : (
        <>
          <Tabs
            value={activeTab}
            onChange={(_event, value: TemplateLibraryKind) => {
              setActiveTab(value);
            }}
          >
            {CATALOG_KINDS.map((kind) => (
              <Tab key={kind} value={kind} label={KIND_LABELS[kind]} />
            ))}
          </Tabs>
          {renderKindPanel(activeTab)}
        </>
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
  coerceTemplateLibraryEntries,
  documentTypeFilters,
  filterTemplateLibraryEntries,
  recipeTagFilters,
} from "./templatesLibraryTypes.js";
