"""Map between ORM rows and Pydantic domain models."""

import json
from datetime import UTC, datetime

from roborean_spec import (
    Project,
    RunDiff,
    RunError,
    RunRecord,
    RunRequest,
    RunResults,
    RunStatus,
    project_from_dict,
    project_to_dict,
)

from .models import ProjectRevisionRow, ProjectRow, RunRow


def _parse_dt(value: str | None) -> datetime | None:
    """Parse an ISO timestamp into an aware datetime.

    Args:
        value: ISO-8601 timestamp string, or ``None``.

    Returns:
        Parsed ``datetime``, or ``None`` when ``value`` is ``None``.
    """
    if value is None:
        return None
    return datetime.fromisoformat(value)


def _fmt_dt(value: datetime | None) -> str | None:
    """Format a datetime as ISO-8601.

    Args:
        value: Datetime to format, or ``None``.

    Returns:
        ISO-8601 string, or ``None`` when ``value`` is ``None``.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat()


def project_to_row(project: Project, revision: str) -> ProjectRow:
    """Build a current-project ORM row.

    Args:
        project: Project model to persist.
        revision: Revision identifier associated with ``project``.

    Returns:
        New ``ProjectRow`` ready for insertion.
    """
    now = datetime.now(UTC)
    return ProjectRow(
        id=project.id,
        revision=revision,
        name=project.name,
        schema_version=project.schema_version,
        body_json=json.dumps(project_to_dict(project), ensure_ascii=False),
        created_at=now,
        updated_at=now,
    )


def row_to_project(row: ProjectRow) -> Project:
    """Restore a project from a current-project row.

    Args:
        row: Current-project ORM row.

    Returns:
        Validated ``Project`` model.
    """
    return project_from_dict(json.loads(row.body_json))


def revision_to_row(
    project: Project,
    revision: str,
    compiled_json: str | None = None,
) -> ProjectRevisionRow:
    """Build a revision snapshot row.

    Args:
        project: Project model to snapshot.
        revision: Revision identifier for the snapshot.
        compiled_json: Serialized compiled output to store alongside
            the snapshot, or ``None`` when not compiled.

    Returns:
        New ``ProjectRevisionRow`` ready for insertion.
    """
    return ProjectRevisionRow(
        project_id=project.id,
        revision=revision,
        body_json=json.dumps(project_to_dict(project), ensure_ascii=False),
        compiled_json=compiled_json,
        created_at=datetime.now(UTC),
    )


def run_to_row(record: RunRecord) -> RunRow:
    """Build a run ORM row from a domain record.

    Args:
        record: Run record to persist.

    Returns:
        New ``RunRow`` ready for insertion or update.
    """
    # Serialize the request body, which every run record carries.
    request_json = json.dumps(
        record.request.model_dump(
            mode="json", by_alias=True, exclude_none=True
        ),
        ensure_ascii=False,
    )

    # Serialize the optional results, diff, and error payloads.
    results_json = (
        None
        if record.results is None
        else json.dumps(
            record.results.model_dump(
                mode="json", by_alias=True, exclude_none=True
            ),
            ensure_ascii=False,
        )
    )
    diff_json = (
        None
        if record.diff is None
        else json.dumps(
            record.diff.model_dump(
                mode="json", by_alias=True, exclude_none=True
            ),
            ensure_ascii=False,
        )
    )
    error_json = (
        None
        if record.error is None
        else json.dumps(
            record.error.model_dump(
                mode="json", by_alias=True, exclude_none=True
            ),
            ensure_ascii=False,
        )
    )

    # Assemble the ORM row from the record fields and serialized JSON.
    return RunRow(
        run_id=record.run_id,
        project_id=record.project_id,
        project_revision=record.project_revision,
        idempotency_key=record.idempotency_key,
        status=record.status.value,
        request_json=request_json,
        results_json=results_json,
        diff_json=diff_json,
        attempt=record.attempt,
        engine_version=record.engine_version,
        plugin_versions_json=json.dumps(record.plugin_versions),
        compiled_digest=record.compiled_digest,
        error_json=error_json,
        request_digest=record.request_digest,
        retry_policy_json=json.dumps(record.retry_policy_snapshot),
        created_at=_parse_dt(record.created_at) or datetime.now(UTC),
        started_at=_parse_dt(record.started_at),
        finished_at=_parse_dt(record.finished_at),
    )


def row_to_run(row: RunRow) -> RunRecord:
    """Restore a domain run record from an ORM row.

    Args:
        row: Run ORM row.

    Returns:
        Validated ``RunRecord`` model.
    """
    # Deserialize the optional results, diff, and error payloads.
    results = None
    if row.results_json:
        results = RunResults.model_validate(json.loads(row.results_json))
    diff = None
    if row.diff_json:
        diff = RunDiff.model_validate(json.loads(row.diff_json))
    error = None
    if row.error_json:
        error = RunError.model_validate(json.loads(row.error_json))

    # Assemble the domain record from the row fields and deserialized
    # JSON payloads.
    return RunRecord(
        runId=row.run_id,
        idempotencyKey=row.idempotency_key,
        projectId=row.project_id,
        projectRevision=row.project_revision,
        compiledDigest=row.compiled_digest,
        status=RunStatus(row.status),
        request=RunRequest.model_validate(json.loads(row.request_json)),
        results=results,
        diff=diff,
        attempt=row.attempt,
        retryPolicySnapshot=json.loads(row.retry_policy_json),
        engineVersion=row.engine_version,
        pluginVersions=json.loads(row.plugin_versions_json),
        error=error,
        createdAt=_fmt_dt(row.created_at) or "",
        startedAt=_fmt_dt(row.started_at),
        finishedAt=_fmt_dt(row.finished_at),
        requestDigest=row.request_digest,
    )
