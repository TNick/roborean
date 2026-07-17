"""Engine and session helpers."""

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base


def make_engine(url: str) -> Engine:
    """Create a SQLAlchemy engine for the given URL."""
    return create_engine(url, future=True)


def make_session_factory(engine: Engine) -> sessionmaker:
    """Create a session factory bound to ``engine``."""
    return sessionmaker(bind=engine, expire_on_commit=False, future=True)


def create_all(engine: Engine) -> None:
    """Create ORM tables if they do not exist."""
    Base.metadata.create_all(engine)
