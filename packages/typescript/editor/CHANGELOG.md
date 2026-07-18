# Changelog

## [Unreleased]

### Added

- Optional `runLabel` prop so hosts can describe browser Google Workspace
  runs versus FastAPI server runs.
- Bit type picker and bit list show manifest display names instead of raw
  type ids; new bits default their label from the type name.
- Allowed-value literals render as filterable Autocomplete selects that only
  accept schema `enum` entries.
- Predefined value suggestions via `x-roborean-predefined` with optional labels;
  users can still enter other values.
- Nullable public literals with an Allow null toggle, clear-to-null control,
  and `null` placeholder text.
- Collapsible search on Variables, Bits, and Documents sidebar lists with
  case-insensitive filtering (variables match key, description, and default
  value content).
- Document editor uses title and multiline description instead of exposing
  auto-allocated document ids; lists and bit pickers show document titles.
- Copy-on-write template editing with edited-state badge, text/binary
  template controls, and revert to the shared template reference.
- Structured variable value editor for public literals: value type selector,
  typed default value input, and add/remove JSON Schema constraints via a
  dialog.
- Add, remove, and edit workspace variables, bits, and document definitions
  in the project editor (store mutators, list actions, and `DocumentForm`).
- Editor panels: workspace, documents, dependency graph, preview, and bit
  reorder controls.
- Dependency on `@roborean/documents-preview` for renderer-owned previews.
- `RuleAstEditor`, manifest-backed `BitForm`, and `VariableForm` for
  structured project editing.
- `RunHistoryPanel`, SVG dependency graph with click-to-select, and HTML5
  drag-and-drop bit reordering.
- Server-side document preview in `PreviewPanel` for backend document types
  when the API client is configured.

### Changed

- Hide list search controls for variables, bits, and documents when the
  corresponding list is empty.
- `ProjectEditor` uses split panels instead of a single bit JSON dump.
- Project toolbar uses shared `AppToolbar` with icon-only Edit, labeled
  Dry-run / Save / Run on server, and host-provided `toolbarEnd` actions.
- Edit opens a dialog for title, description, and optional delete.
- Bit, variable, document, and rule forms use `FormStack` so control gaps
  follow the theme spacing preset.
- `roborean.set_variable` bit config uses the shared workspace value editor
  locked to the target variable's declared type and constraints; only the
  value is editable.
- Sidebar list panels (variables, bits, documents, run history) and
  diagnostics use scrollable sections so stacked panels remain visible.
- Value editors use `FormTextField` so outlined, filled, and standard
  variants follow the theme field-variant setting.
- Bit detail shows move-up/down icon buttons with tooltips on the title row.
- Variables panel title is `Variables`; redundant inner label removed.
- Bits are shown by label (or `(no label)`); bit id stays internal. Bit detail
  first row is read-only type plus move controls.
- Bit activation conditions open in a dedicated editor via a toolbar button
  (highlighted when a condition is set); Remove / Set condition(s) apply.
- Variable key fields use a filterable autocomplete over workspace keys.
- Variable Exposure and default value kind use readable labels with info
  tooltips; stored schema values are unchanged.
- Variable description uses a multiline field; raw JSON Schema and default
  value JSON move to a collapsible Advanced section.
- Variable default value editor shows an error state when the literal does not
  satisfy JSON Schema constraints, with messages naming the failed constraint;
  the constraints list keeps showing constraint values and highlights failures
  without repeating the error text.
- Dependency graph supports mouse wheel zoom, drag pan, and double-click
  reset.

### Fixed

- Dependency graph keeps node circles and labels inside the frame instead of
  clipping the leftmost column.
- Dependency graph node labels and edges use theme palette colors so they stay
  visible in the black theme.


## [0.1.3] - 2026-07-17

### Added

- React project editor with local validate/dry-run, diagnostics, dependency
  graph, and optional server run wiring.
- Editable project name and description fields with Save via the API.

### Changed

- Dry-run panel exposes `data-testid="dry-run-status"` for Playwright E2E.
