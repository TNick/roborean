"""SQLAlchemy persistence adapter for Roborean."""

from .migrate import SCHEMA_VERSION, upgrade
from .package_materializer import materialize_project_package
from .project_repo import SqlAlchemyProjectRepository
from .run_repo import SqlAlchemyRunRepository
from .session import create_all, make_engine, make_session_factory

__version__ = "0.2.0"

__all__ = [
    "SCHEMA_VERSION",
    "SqlAlchemyProjectRepository",
    "SqlAlchemyRunRepository",
    "create_all",
    "make_engine",
    "make_session_factory",
    "materialize_project_package",
    "upgrade",
]
