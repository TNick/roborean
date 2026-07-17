# roborean-storage-dict

Filesystem JSON/YAML persistence for projects and runs.

YAML loading uses `yaml.safe_load` only.

```python
from roborean_storage_dict import DictProjectRepository, DictRunRepository

projects = DictProjectRepository(Path(".roborean"))
runs = DictRunRepository(Path(".roborean"))
```
