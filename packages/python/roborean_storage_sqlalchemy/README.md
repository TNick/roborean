# roborean-storage-sqlalchemy

SQLAlchemy adapter for Roborean projects and durable runs. ORM rows map
to/from Pydantic domain models; the engine depends only on repository ports.

Use this adapter (CLI `sql:…`, FastAPI with a shared database URL) when
multiple processes need durable runs and project revisions on one store.

```python
from roborean_storage_sqlalchemy import (
    SqlAlchemyProjectRepository,
    make_engine,
    make_session_factory,
    upgrade,
)

engine = make_engine("sqlite+pysqlite:///./roborean.db")
upgrade(engine)
factory = make_session_factory(engine)
projects = SqlAlchemyProjectRepository(factory)
```
