"""SQLAlchemy run repository."""

import logging

from roborean_spec import RunRecord
from roborean_storage_base import ConflictError, NotFoundError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError as SAIntegrityError
from sqlalchemy.orm import sessionmaker

from .mappers import row_to_run, run_to_row
from .models import RunRow

logger = logging.getLogger(__name__)


class SqlAlchemyRunRepository:
    """Persist durable runs through SQLAlchemy sessions."""

    def __init__(self, session_factory: sessionmaker) -> None:
        """Bind to a session factory."""
        self._session_factory = session_factory

    def get(self, run_id: str) -> RunRecord:
        """Return one run by identifier."""
        with self._session_factory() as session:
            row = session.get(RunRow, run_id)
            if row is None:
                raise NotFoundError(run_id)
            return row_to_run(row)

    def get_by_idempotency(
        self, project_id: str, idempotency_key: str
    ) -> RunRecord | None:
        """Return an existing run for an idempotency key, if any."""
        with self._session_factory() as session:
            row = session.scalar(
                select(RunRow).where(
                    RunRow.project_id == project_id,
                    RunRow.idempotency_key == idempotency_key,
                )
            )
            return None if row is None else row_to_run(row)

    def save(self, record: RunRecord) -> None:
        """Insert a new run, mapping unique violations to conflicts."""
        with self._session_factory() as session:
            existing = session.scalar(
                select(RunRow).where(
                    RunRow.project_id == record.project_id,
                    RunRow.idempotency_key == record.idempotency_key,
                )
            )
            if existing is not None:
                if existing.request_digest != record.request_digest:
                    raise ConflictError(
                        "idempotency key reused with a different request body"
                    )
                raise ConflictError("idempotency key already exists")
            session.add(run_to_row(record))
            try:
                session.commit()
            except SAIntegrityError as error:
                session.rollback()
                logger.debug(
                    "Unique constraint on run insert for %s",
                    record.run_id,
                    exc_info=True,
                )
                raise ConflictError("idempotency key already exists") from error

    def update(self, record: RunRecord) -> None:
        """Replace an existing run row."""
        with self._session_factory() as session:
            row = session.get(RunRow, record.run_id)
            if row is None:
                raise NotFoundError(record.run_id)
            mapped = run_to_row(record)
            row.status = mapped.status
            row.request_json = mapped.request_json
            row.results_json = mapped.results_json
            row.diff_json = mapped.diff_json
            row.attempt = mapped.attempt
            row.error_json = mapped.error_json
            row.compiled_digest = mapped.compiled_digest
            row.plugin_versions_json = mapped.plugin_versions_json
            row.retry_policy_json = mapped.retry_policy_json
            row.started_at = mapped.started_at
            row.finished_at = mapped.finished_at
            session.commit()

    def list_for_project(
        self, project_id: str, *, limit: int = 50
    ) -> list[RunRecord]:
        """List recent runs for a project, newest first."""
        with self._session_factory() as session:
            rows = session.scalars(
                select(RunRow)
                .where(RunRow.project_id == project_id)
                .order_by(RunRow.created_at.desc())
                .limit(limit)
            )
            return [row_to_run(row) for row in rows]
