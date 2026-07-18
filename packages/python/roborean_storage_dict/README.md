# roborean-storage-dict

Filesystem JSON/YAML persistence for projects and runs.

The dict run store claims idempotency keys with exclusive index files so
duplicate keys under concurrent writers on the same root resolve to one run.

YAML loading uses `yaml.safe_load` only.

```python
from roborean_storage_dict import DictProjectRepository, DictRunRepository

projects = DictProjectRepository(Path(".roborean"))
runs = DictRunRepository(Path(".roborean"))
```
