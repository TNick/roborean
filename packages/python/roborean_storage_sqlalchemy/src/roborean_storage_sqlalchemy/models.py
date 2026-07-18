"""ORM storage shapes (not domain models)."""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for Roborean storage tables."""


class SchemaMetaRow(Base):
    """Tracks the storage schema version.

    Attributes:
        __tablename__: ``"schema_meta"``.
        id: Primary key row identifier.
        version: Current storage schema version number.
    """

    __tablename__ = "schema_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)


class ProjectRow(Base):
    """Current project document storage.

    Attributes:
        __tablename__: ``"projects"``.
        id: Project identifier and primary key.
        revision: Identifier of the revision currently stored.
        name: Human-readable project name.
        schema_version: Project schema version string.
        body_json: Serialized project document, as JSON text.
        created_at: Timestamp when the row was first created.
        updated_at: Timestamp when the row was last updated.
    """

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    revision: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    schema_version: Mapped[str] = mapped_column(String(32), nullable=False)
    body_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ProjectFileRow(Base):
    """Binary project package files keyed by relative path.

    Attributes:
        __tablename__: ``"project_files"``.
        __table_args__: Unique constraint on (``project_id``, ``path``).
        project_id: Project identifier; part of the composite primary
            key.
        path: Relative path inside the project package (for example
            ``templates/hello.txt``).
        content: Raw file bytes.
        updated_at: Timestamp when the file row was last updated.
    """

    __tablename__ = "project_files"
    __table_args__ = (
        UniqueConstraint("project_id", "path", name="uq_project_files_path"),
    )

    project_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    path: Mapped[str] = mapped_column(String(1024), primary_key=True)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ProjectRevisionRow(Base):
    """Immutable project revision snapshots.

    Attributes:
        __tablename__: ``"project_revisions"``.
        project_id: Project identifier; part of the composite primary
            key.
        revision: Revision identifier; part of the composite primary
            key.
        body_json: Serialized project document, as JSON text.
        compiled_json: Serialized compiled output, as JSON text, or
            ``None`` when the revision has not been compiled.
        created_at: Timestamp when the revision snapshot was created.
    """

    __tablename__ = "project_revisions"

    project_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    revision: Mapped[str] = mapped_column(String(128), primary_key=True)
    body_json: Mapped[str] = mapped_column(Text, nullable=False)
    compiled_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RunRow(Base):
    """Durable run records.

    Attributes:
        __tablename__: ``"runs"``.
        __table_args__: Unique constraint on
            (``project_id``, ``idempotency_key``), named
            ``"uq_runs_project_idempotency"``.
        run_id: Run identifier and primary key.
        project_id: Project identifier owning the run.
        project_revision: Project revision the run was compiled
            against.
        idempotency_key: Idempotency key supplied by the run request.
        status: Run status value, as a string.
        request_json: Serialized run request, as JSON text.
        results_json: Serialized run results, as JSON text, or
            ``None`` when the run has not produced results.
        diff_json: Serialized run diff, as JSON text, or ``None``
            when no diff is available.
        attempt: Attempt number for this run, starting at ``1``.
        engine_version: Engine version that executed the run.
        plugin_versions_json: Serialized plugin version map, as JSON
            text.
        compiled_digest: Digest of the compiled project used by the
            run.
        error_json: Serialized run error, as JSON text, or ``None``
            when the run has not errored.
        request_digest: Digest of the run request body.
        retry_policy_json: Serialized retry policy snapshot, as JSON
            text.
        created_at: Timestamp when the run record was created.
        started_at: Timestamp when the run started, or ``None`` when
            it has not started yet.
        finished_at: Timestamp when the run finished, or ``None``
            when it has not finished yet.
    """

    __tablename__ = "runs"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "idempotency_key",
            name="uq_runs_project_idempotency",
        ),
    )

    run_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(255), nullable=False)
    project_revision: Mapped[str] = mapped_column(String(128), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    request_json: Mapped[str] = mapped_column(Text, nullable=False)
    results_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    diff_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    engine_version: Mapped[str] = mapped_column(String(64), nullable=False)
    plugin_versions_json: Mapped[str] = mapped_column(Text, nullable=False)
    compiled_digest: Mapped[str] = mapped_column(String(128), nullable=False)
    error_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_digest: Mapped[str] = mapped_column(String(128), nullable=False)
    retry_policy_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
