# Changelog

## [Unreleased]

### Added

- `ToolbarActionButton` shows icon+label from `lg` up and icon-only below
  `lg` (compact editor layout still switches at `md`).
- `ToolbarOverflowMenu` for compact toolbars: `MoreVert` trigger with icon
  rows and an optional footer slot.
- `AppToolbar` accepts optional `startActions` rendered left of the page
  title for host navigation chrome.
- `AppToolbarTitle` adds viewport-scaled left/right margin so page titles
  stand out when space allows.
- Starter buttons expose `data-testid="use-starter-{id}"` for Playwright E2E.
- `TemplatesLibrary` component with document, starter, and recipe tabs plus
  search, filter chips, and required bit type name chips on recipes.
- `RoboreanResponsiveToolbarEnd` and `useCompactToolbarLayout` share the
  compact toolbar breakpoint (`md`) used by the project editor.
- Material UI theme and shared layout primitives for the Roborean editor.
- Reusable `AppToolbar`, controlled `ThemeSettingsButton`, and stub
  `UserMenuButton` for host-injectable global chrome.
- Optional `ThemePreferencesProvider`, `createRoboreanTheme`, and
  `RoboreanToolbarEnd` adapter for Roborean hosts.
- `FormStack` and `useControlStackSpacing` for theme-driven gaps between
  consecutive form controls.
- `FormTextField`, `useFieldVariant`, and a field-variant preference
  (outlined, filled, standard) in the theme settings menu.

### Changed

- Account chrome labels the current mode as Public access instead of
  Account — coming soon.

### Fixed

- Restore standalone TypeScript builds with MUI default-export resolution and valid menu ARIA semantics.

- Toolbar overflow menu omits dividers when the section above them is
  empty (for example theme rows with no page actions).
- Dark theme uses lighter primary and secondary colors so text buttons
  (for example dialog Cancel actions) stay readable on dark surfaces.
- Collapsed panel search icon is centered inside its focus outline.

### Changed

- Compact toolbar overflow integrates theme categories (submenu opens to the
  left) and account as menu rows instead of separate toolbar buttons.
- Theme and account toolbar controls use `ToolbarActionButton` so they
  show labels on wide screens.
- `TemplatesLibrary` shows three side-by-side cards from the `md`
  breakpoint up, and keeps the tabbed layout on narrower viewports.
- `roboreanTheme` is derived from default appearance preferences.
- Theme settings menu items show icons for color, spacing, and font size.
- Font size presets now scale MUI typography via `fontSize` instead of
  `htmlFontSize`, so Small and Large apply in the expected direction.
- Spacing presets set `theme.roborean.controlStackSpacing` for form layouts
  and default MUI button sizes (compact → small, default → medium,
  comfortable → large).
- Field variant preference sets `theme.roborean.fieldVariant` and MUI
  TextField defaults.
- `ScrollablePanelSection` caps list panel height so stacked sidebar panels
  stay visible together in the project editor.
- Scrollbars use theme-aware colors in light and dark mode (Firefox and
  WebKit).
