"""SQLAlchemy project repository."""

import json
from datetime import UTC, datetime

from roborean_spec import Project, project_from_dict
from roborean_storage_base import NotFoundError
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from .mappers import project_to_row, revision_to_row, row_to_project
from .models import ProjectFileRow, ProjectRevisionRow, ProjectRow


class SqlAlchemyProjectRepository:
    """Persist projects through SQLAlchemy sessions.

    Attributes:
        _session_factory: Factory that opens short-lived ORM sessions.
    """

    _session_factory: sessionmaker

    def __init__(self, session_factory: sessionmaker) -> None:
        """Bind to a session factory.

        Args:
            session_factory: SQLAlchemy sessionmaker for this repository.
        """
        self._session_factory = session_factory

    def get(self, project_id: str) -> Project:
        """Return the current project document.

        Args:
            project_id: Stable project identifier.

        Returns:
            Current project document.

        Raises:
            NotFoundError: When the project is not stored.
        """
        with self._session_factory() as session:
            row = session.get(ProjectRow, project_id)
            if row is None:
                raise NotFoundError(project_id)
            return row_to_project(row)

    def get_revision(self, project_id: str, revision: str) -> Project:
        """Return a pinned revision document.

        Args:
            project_id: Stable project identifier.
            revision: Revision identifier to load.

        Returns:
            Project document at the requested revision.

        Raises:
            NotFoundError: When the revision is not stored.
        """
        with self._session_factory() as session:
            row = session.get(
                ProjectRevisionRow,
                {"project_id": project_id, "revision": revision},
            )
            if row is None:
                raise NotFoundError(f"{project_id}@{revision}")
            return project_from_dict(json.loads(row.body_json))

    def save(self, project: Project, *, revision: str | None = None) -> str:
        """Upsert the current project and write a revision snapshot.

        Args:
            project: Project document to store.
            revision: Optional revision identifier; defaults to ``1``.

        Returns:
            Revision identifier that was persisted.
        """
        rev = revision or "1"
        with self._session_factory() as session:
            existing = session.get(ProjectRow, project.id)

            # Insert a new current row or refresh mutable columns in place.
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

    def get_file(self, project_id: str, relative_path: str) -> bytes:
        """Read one project package file.

        Args:
            project_id: Stable project identifier.
            relative_path: Path relative to the package root.

        Returns:
            Raw file bytes.

        Raises:
            NotFoundError: When the file is not stored.
        """
        with self._session_factory() as session:
            row = session.get(
                ProjectFileRow,
                {"project_id": project_id, "path": relative_path},
            )
            if row is None:
                raise NotFoundError(relative_path)
            return bytes(row.content)

    def put_file(
        self, project_id: str, relative_path: str, data: bytes
    ) -> None:
        """Write one project package file.

        Args:
            project_id: Stable project identifier.
            relative_path: Path relative to the package root.
            data: Raw file bytes to persist.
        """
        with self._session_factory() as session:
            row = session.get(
                ProjectFileRow,
                {"project_id": project_id, "path": relative_path},
            )
            now = datetime.now(UTC)
            if row is None:
                session.add(
                    ProjectFileRow(
                        project_id=project_id,
                        path=relative_path,
                        content=data,
                        updated_at=now,
                    )
                )
            else:
                row.content = data
                row.updated_at = now
            session.commit()

    def delete_file(self, project_id: str, relative_path: str) -> None:
        """Remove one project package file when present.

        Args:
            project_id: Stable project identifier.
            relative_path: Path relative to the package root.
        """
        with self._session_factory() as session:
            row = session.get(
                ProjectFileRow,
                {"project_id": project_id, "path": relative_path},
            )
            if row is not None:
                session.delete(row)
                session.commit()

    def list_files(self, project_id: str) -> list[str]:
        """List stored relative paths for one project.

        Args:
            project_id: Stable project identifier.

        Returns:
            Sorted list of relative package paths.
        """
        with self._session_factory() as session:
            rows = session.scalars(
                select(ProjectFileRow.path)
                .where(ProjectFileRow.project_id == project_id)
                .order_by(ProjectFileRow.path)
            )
            return list(rows)

    def list_ids(self) -> list[str]:
        """List stored project identifiers.

        Returns:
            Sorted list of project ids.
        """
        with self._session_factory() as session:
            rows = session.scalars(
                select(ProjectRow.id).order_by(ProjectRow.id)
            )
            return list(rows)

    def delete(self, project_id: str) -> None:
        """Delete a project and its revisions.

        Args:
            project_id: Stable project identifier to delete.

        Raises:
            NotFoundError: When the project is not stored.
        """
        with self._session_factory() as session:
            row = session.get(ProjectRow, project_id)
            if row is None:
                raise NotFoundError(project_id)

            # Remove the current row and every revision snapshot.
            session.delete(row)
            revisions = session.scalars(
                select(ProjectRevisionRow).where(
                    ProjectRevisionRow.project_id == project_id
                )
            )
            for revision in revisions:
                session.delete(revision)
            files = session.scalars(
                select(ProjectFileRow).where(
                    ProjectFileRow.project_id == project_id
                )
            )
            for file_row in files:
                session.delete(file_row)
            session.commit()
