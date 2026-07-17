"""Engine and session helpers."""

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base


def make_engine(url: str) -> Engine:
    """Create a SQLAlchemy engine for the given URL.

    Args:
        url: SQLAlchemy database URL.

    Returns:
        Engine configured with the SQLAlchemy 2.0 future API.
    """
    return create_engine(url, future=True)


def make_session_factory(engine: Engine) -> sessionmaker:
    """Create a session factory bound to ``engine``.

    Args:
        engine: SQLAlchemy engine to bind sessions to.

    Returns:
        Session factory with ``expire_on_commit=False``.
    """
    return sessionmaker(bind=engine, expire_on_commit=False, future=True)


def create_all(engine: Engine) -> None:
    """Create ORM tables if they do not exist.

    Args:
        engine: SQLAlchemy engine used to emit DDL.
    """
    Base.metadata.create_all(engine)
