# roborean-documents-docx

Word document driver for Roborean.

`roborean.docx` loads a `.docx` template and applies typed document
operations. Stable slots declared in the template manifest
`requiredInputs` are rendered by docxtpl/Jinja2 at session open (body,
headers, footers, footnotes, and tables). Use the
`roborean.replace_named_value` bit when a value is only known or
computed during the run; that op scans body paragraphs, table cells,
and section headers/footers.

Templates with both kinds of slot should keep op-only placeholders out of
docxtpl's reach, for example with Jinja ``{% raw %}{{slot}}{% endraw %}``
in the `.docx` source. When `requiredInputs` is empty, the driver opens
the template without running docxtpl so bare ``{{slot}}`` text survives
until document ops run.
