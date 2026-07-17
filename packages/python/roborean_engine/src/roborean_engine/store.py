"""Parse CLI store specifications into repository implementations."""

from pathlib import Path

from roborean_storage_base import (
    ArtifactStore,
    ProjectRepository,
    RunRepository,
)
from roborean_storage_dict import (
    DictArtifactStore,
    DictProjectRepository,
    DictRunRepository,
)


def parse_store(
    spec: str,
) -> tuple[ProjectRepository, RunRepository, ArtifactStore]:
    """Parse ``dict:<path>`` or ``sql:<url>`` store specifications."""
    if spec.startswith("dict:"):
        root = Path(spec.removeprefix("dict:")).expanduser().resolve()
        root.mkdir(parents=True, exist_ok=True)
        return (
            DictProjectRepository(root),
            DictRunRepository(root),
            DictArtifactStore(root),
        )
    if spec.startswith("sql:"):
        from roborean_storage_sqlalchemy import (
            SqlAlchemyProjectRepository,
            SqlAlchemyRunRepository,
            make_engine,
            make_session_factory,
            upgrade,
        )

        url = spec.removeprefix("sql:")
        engine = make_engine(url)
        upgrade(engine)
        factory = make_session_factory(engine)
        # SQL adapter has no separate blob store yet; reuse dict under cwd.
        artifacts = DictArtifactStore(Path(".roborean-sql-artifacts"))
        return (
            SqlAlchemyProjectRepository(factory),
            SqlAlchemyRunRepository(factory),
            artifacts,
        )
    raise ValueError(
        f"Unknown store spec {spec!r}; use dict:<path> or sql:<url>"
    )


def init_store(spec: str) -> None:
    """Initialize an empty store."""
    parse_store(spec)
