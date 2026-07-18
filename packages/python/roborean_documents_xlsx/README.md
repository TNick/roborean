# roborean-documents-xlsx

Spreadsheet document driver for Roborean.

`roborean.xlsx` loads an `.xlsx` template and applies sheet operations
plus `replace_named_value`, which scans every sheet for Mustache-like
`{{slot}}` placeholders in non-formula string cells.
