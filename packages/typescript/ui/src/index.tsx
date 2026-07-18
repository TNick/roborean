import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import { CollapsibleSearchField } from "./CollapsibleSearchField.js";
import { themedScrollbarSx } from "./scrollbarStyles.js";

export { AppToolbar, type AppToolbarProps } from "./AppToolbar.js";
export {
  AppToolbarTitle,
  type AppToolbarTitleProps,
} from "./AppToolbarTitle.js";
export {
  ToolbarActionButton,
  type ToolbarActionButtonProps,
} from "./ToolbarActionButton.js";
export {
  ToolbarOverflowMenu,
  type ToolbarOverflowMenuItem,
  type ToolbarOverflowMenuProps,
  type ToolbarOverflowSubmenuOption,
} from "./ToolbarOverflowMenu.js";
export { FormStack } from "./FormStack.js";
export { FormTextField } from "./FormTextField.js";
export {
  buttonSizeForPreset,
  controlStackSpacingForPreset,
  defaultButtonSize,
  defaultControlStackSpacing,
  defaultFieldVariant,
  type ButtonSize,
} from "./roboreanThemeAugmentation.js";
export { useControlStackSpacing } from "./useControlStackSpacing.js";
export { useFieldVariant } from "./useFieldVariant.js";
export {
  defaultAppearancePreferences,
  type AppearancePreferences,
  type ColorMode,
  type FieldVariant,
  type FontSizePreset,
  type SpacingPreset,
} from "./appearancePreferences.js";
export { RoboreanToolbarEnd } from "./RoboreanToolbarEnd.js";
export {
  RoboreanResponsiveToolbarEnd,
  type RoboreanResponsiveToolbarEndProps,
} from "./RoboreanResponsiveToolbarEnd.js";
export { useCompactToolbarLayout } from "./useCompactToolbarLayout.js";
export {
  buildRoboreanToolbarOverflowItems,
  useRoboreanToolbarOverflowItems,
  type RoboreanToolbarOverflowGroups,
} from "./roboreanToolbarOverflowItems.js";
export {
  ThemePreferencesProvider,
  useThemePreferences,
  type ThemePreferencesContextValue,
  type ThemePreferencesProviderProps,
} from "./ThemePreferencesProvider.js";
export {
  ThemeSettingsButton,
  type ThemeSettingsButtonProps,
} from "./ThemeSettingsButton.js";
export { UserMenuButton, type UserMenuButtonProps } from "./UserMenuButton.js";
export {
  loadThemePreferences,
  saveThemePreferences,
  THEME_PREFERENCES_STORAGE_KEY,
} from "./themePreferences.js";
export { createRoboreanTheme, roboreanTheme } from "./theme.js";
export {
  CollapsibleSearchField,
  type CollapsibleSearchFieldProps,
} from "./CollapsibleSearchField.js";
export {
  TemplatesLibrary,
  documentTypeFilters,
  filterTemplateLibraryEntries,
  recipeTagFilters,
  type TemplateLibraryEntry,
  type TemplateLibraryKind,
  type TemplatesLibraryProps,
} from "./TemplatesLibrary.js";
export {
  Alert,
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
};

export type PanelProps = {
  /** Panel section title shown on the left of the header row. */
  title: string;

  /** Panel body content. */
  children: ReactNode;

  /** Optional control rendered on the right of the title row. */
  headerEnd?: ReactNode;

  /** Optional search query shown in a collapsible field on the title row. */
  searchQuery?: string;

  /**
   * Called when the user edits the optional panel search field.
   *
   * @param query - Updated search query text.
   */
  onSearchQueryChange?: (query: string) => void;

  /** Placeholder for the optional panel search field. */
  searchPlaceholder?: string;
};

/** Default max height for scrollable list sections in stacked editor panels. */
export const PANEL_LIST_MAX_HEIGHT = 220;

export type ScrollablePanelSectionProps = {
  /** Panel section content that should scroll when it overflows. */
  children: ReactNode;

  /** Maximum section height before vertical scrolling is enabled. */
  maxHeight?: number | string;
};

/**
 * Scrollable body region for list-style editor panels.
 *
 * @param props - Children and optional max height override.
 * @returns Scrollable panel section element.
 */
export function ScrollablePanelSection({
  children,
  maxHeight = PANEL_LIST_MAX_HEIGHT,
}: ScrollablePanelSectionProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        maxHeight,
        overflowY: "auto",
        overflowX: "hidden",
        pr: 0.5,
        ...themedScrollbarSx(theme),
      }}
    >
      {children}
    </Box>
  );
}

/** Titled section chrome for editor panels. */
export function Panel({
  title,
  children,
  headerEnd,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
}: PanelProps) {
  const showSearch =
    searchQuery !== undefined && onSearchQueryChange !== undefined;

  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
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
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1, minWidth: 0 }} />
        {headerEnd ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {headerEnd}
          </Box>
        ) : null}
        {showSearch ? (
          <CollapsibleSearchField
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder={searchPlaceholder}
            ariaLabel={`Search ${title.toLowerCase()}`}
          />
        ) : null}
      </Box>
      {children}
    </Paper>
  );
}

export type DiagnosticItem = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  path?: string;
};

export type DiagnosticListProps = {
  items: DiagnosticItem[];
  onSelectPath?: (path: string) => void;
};

/** Render diagnostics with optional jump-to-path. */
export function DiagnosticList({ items, onSelectPath }: DiagnosticListProps) {
  return (
    <Stack spacing={1}>
      {items.map((item, index) => (
        <Alert
          key={`${item.code}-${index}`}
          severity={item.severity}
          onClick={() => item.path && onSelectPath?.(item.path)}
          sx={{ cursor: item.path ? "pointer" : "default" }}
        >
          <Typography variant="body2">
            {item.code}: {item.message}
          </Typography>
        </Alert>
      ))}
    </Stack>
  );
}

export type SplitPaneProps = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
};

/** Three-column editor layout. */
export function SplitPane({ left, center, right }: SplitPaneProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "280px 1fr 320px",
        gap: 2,
        minHeight: "70vh",
      }}
    >
      <Box>{left}</Box>
      <Box>{center}</Box>
      <Box>{right}</Box>
    </Box>
  );
}
