# Changelog

## [Unreleased]

### Added

- `TemplatesLibrary` component with document, starter, and recipe tabs plus
  search, filter chips, and required bit type name chips on recipes.
- Collapsible title-row search field on `Panel` for filterable editor lists.
- Material UI theme and shared layout primitives for the Roborean editor.
- Reusable `AppToolbar`, controlled `ThemeSettingsButton`, and stub
  `UserMenuButton` for host-injectable global chrome.
- Optional `ThemePreferencesProvider`, `createRoboreanTheme`, and
  `RoboreanToolbarEnd` adapter for Roborean hosts.
- `FormStack` and `useControlStackSpacing` for theme-driven gaps between
  consecutive form controls.
- `FormTextField`, `useFieldVariant`, and a field-variant preference
  (outlined, filled, standard) in the theme settings menu.

### Fixed

- Collapsed panel search icon is centered inside its focus outline.

### Changed

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
