# Document Semantics

Normative rules for Phase 3 document drivers and operations.

## Templates

1. Templates are mandatory for all production drivers. Empty-template
   drivers are forbidden except test-only `roborean.null`.
2. Each template has a sidecar manifest
   (`templates/<id>.manifest.json` by default).
3. When a document's template content is edited in the editor, the
   project forks a stand-alone template for that document. The fork is
   tracked with optional ``baseTemplateRef`` pointing at the shared
   template the document originally referenced. Revert drops the fork
   and restores ``templateRef`` to ``baseTemplateRef``.
3. Slot syntax for the text driver is Mustache-like `{{slot}}` replace
   only — no Jinja logic in Phase 3.
4. Text artifacts use LF newlines. Trailing newline is preserved when the
   template ends with one; otherwise serialize does not invent one unless
   the golden fixture requires it. Golden `D01` expects
   `Hello, Ada!\n`.

## Capability namespaces

Formats are not symmetric. Unknown ops for a driver capability set are
compile errors in strict mode and run errors otherwise.

Namespaces: `plain.*`, `flow.*`, `sheet.*`, `drawing.*`, `raster.*`,
plus common ops `set_metadata`, `replace_named_value`, `finalize`.

## Previews

Preview is renderer-owned. AI must never replace preview bytes. Browser
preview for xlsx/docx is operation-stream HTML, not a pixel-perfect
Office clone. Final bytes come from Python drivers.

## Secrets

Drivers must not stringify `secret_ref` into previews. Final serialize
may resolve secrets only with an explicit `secrets.resolve` capability.

## Golden tests

Prefer semantic compare for Office/ZIP/DXF formats. Prefer exact UTF-8
compare for text and Markdown.
