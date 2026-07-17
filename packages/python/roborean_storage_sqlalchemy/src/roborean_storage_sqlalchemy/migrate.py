"""Internal storage schema migrator."""

from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from .models import SchemaMetaRow
from .session import create_all

SCHEMA_VERSION = 1


def current_version(engine: Engine) -> int:
    """Return the installed schema version, or 0 when unset."""
    create_all(engine)
    with Session(engine) as session:
        row = session.scalar(select(SchemaMetaRow).limit(1))
        return 0 if row is None else row.version


def upgrade(engine: Engine) -> None:
    """Create tables and stamp the schema version."""
    create_all(engine)
    with Session(engine) as session:
        row = session.scalar(select(SchemaMetaRow).limit(1))
        if row is None:
            session.add(SchemaMetaRow(id=1, version=SCHEMA_VERSION))
        else:
            row.version = SCHEMA_VERSION
        session.commit()
