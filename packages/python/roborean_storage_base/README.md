# roborean-storage-base

Persistence ports for Roborean projects and durable runs.

```python
from roborean_storage_base import ProjectRepository, RunRepository
```

Adapters implement these protocols; the engine never writes files directly
from `runner.py`.
