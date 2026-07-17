# roborean-storage-sqlalchemy

SQLAlchemy adapter for Roborean projects and durable runs. ORM rows map
to/from Pydantic domain models; the engine depends only on repository ports.

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
