"""SQLAlchemy project repository."""

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from roborean_spec import Project, project_from_dict
from roborean_storage_base import NotFoundError

from .mappers import project_to_row, revision_to_row, row_to_project
from .models import ProjectRevisionRow, ProjectRow


class SqlAlchemyProjectRepository:
    """Persist projects through SQLAlchemy sessions."""

    def __init__(self, session_factory: sessionmaker) -> None:
        """Bind to a session factory."""
        self._session_factory = session_factory

    def get(self, project_id: str) -> Project:
        """Return the current project document."""
        with self._session_factory() as session:
            row = session.get(ProjectRow, project_id)
            if row is None:
                raise NotFoundError(project_id)
            return row_to_project(row)

    def get_revision(self, project_id: str, revision: str) -> Project:
        """Return a pinned revision document."""
        with self._session_factory() as session:
            row = session.get(
                ProjectRevisionRow,
                {"project_id": project_id, "revision": revision},
            )
            if row is None:
                raise NotFoundError(f"{project_id}@{revision}")
            return project_from_dict(json.loads(row.body_json))

    def save(self, project: Project, *, revision: str | None = None) -> str:
        """Upsert the current project and write a revision snapshot."""
        rev = revision or "1"
        with self._session_factory() as session:
            existing = session.get(ProjectRow, project.id)
            if existing is None:
                session.add(project_to_row(project, rev))
            else:
                existing.revision = rev
                existing.name = project.name
                existing.schema_version = project.schema_version
                existing.body_json = project_to_row(project, rev).body_json
                existing.updated_at = datetime.now(UTC)
            session.merge(revision_to_row(project, rev))
            session.commit()
        return rev

    def list_ids(self) -> list[str]:
        """List stored project identifiers."""
        with self._session_factory() as session:
            rows = session.scalars(
                select(ProjectRow.id).order_by(ProjectRow.id)
            )
            return list(rows)

    def delete(self, project_id: str) -> None:
        """Delete a project and its revisions."""
        with self._session_factory() as session:
            row = session.get(ProjectRow, project_id)
            if row is None:
                raise NotFoundError(project_id)
            session.delete(row)
            revisions = session.scalars(
                select(ProjectRevisionRow).where(
                    ProjectRevisionRow.project_id == project_id
                )
            )
            for revision in revisions:
                session.delete(revision)
            session.commit()
