"""Orchestrate document sessions for a compiled project run."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from roborean_spec import (
    ArtifactRecord,
    CompiledProject,
    DocumentOperation,
    DocumentPreview,
    Project,
)

from .artifact import hash_bytes
from .capabilities import assert_op_allowed
from .errors import DriverError, TemplateError
from .protocol import DocumentDriver, DocumentSession
from .registry import DriverRegistry
from .template_store import DocumentTemplateStore


@dataclass
class _OpenSession:
    """Internal bookkeeping for one open document session.

    Attributes:
        document_id: Document definition identifier.
        driver: Driver instance owning the session.
        session: Mutable driver session state.
        template_id: Template id recorded on the artifact.
        template_version: Template version recorded on the artifact.
        output_target: Relative output path for the artifact.
        media_type: Media type for the serialized artifact.
        payload: Serialized artifact bytes after finalize, if any.
        preview: Optional backend preview after finalize.
    """

    document_id: str
    driver: DocumentDriver
    session: DocumentSession
    template_id: str
    template_version: str
    output_target: str
    media_type: str
    payload: bytes | None = None
    preview: DocumentPreview | None = None


@dataclass
class DocumentSessionManager:
    """Open sessions, apply ops, and finalize artifacts.

    Attributes:
        registry: Installed document driver registry.
        store: Template store bound to the project package.

        _sessions: Open sessions keyed by document definition id.
    """

    registry: DriverRegistry
    store: DocumentTemplateStore

    _sessions: dict[str, _OpenSession] = field(default_factory=dict)

    def open_all(
        self,
        project: Project,
        compiled: CompiledProject,
        workspace: Any,
    ) -> None:
        """Load templates and begin sessions for every document definition.

        Args:
            project: Project containing document definitions.
            compiled: Compiled project snapshot for the run.
            workspace: Current workspace snapshot for sessions.

        Raises:
            TemplateError: When a manifest driver does not match the
                document definition.
            KeyError: When a required driver is not registered.
        """
        # Drop any previous session state before opening a new run.
        self._sessions.clear()

        for definition in project.documents:
            driver = self.registry.get(definition.driver)
            manifest = self.store.load_manifest(
                definition.template_ref,
                manifest_ref=definition.template_manifest_ref,
            )

            # Reject mismatched template/driver pairings early.
            if manifest.driver != definition.driver:
                raise TemplateError(
                    f"Manifest driver {manifest.driver} != {definition.driver}"
                )

            driver.load_template(
                definition.template_ref,
                store=self.store,
                manifest=manifest,
            )
            session = driver.begin_session(
                workspace,
                {
                    "documentId": definition.id,
                    "projectId": project.id,
                    "settings": definition.settings,
                },
            )

            # Prefer the first advertised template media type.
            media = (
                driver.manifest.template_media_types[0]
                if driver.manifest.template_media_types
                else "application/octet-stream"
            )
            self._sessions[definition.id] = _OpenSession(
                document_id=definition.id,
                driver=driver,
                session=session,
                template_id=manifest.template_id,
                template_version=manifest.template_version,
                output_target=definition.output_target
                or f"{definition.id}.bin",
                media_type=media,
            )

    def apply(self, op: DocumentOperation | dict[str, Any]) -> None:
        """Route one operation to the correct session.

        Args:
            op: Typed operation or raw mapping accepted by the validator.

        Raises:
            DriverError: When no session is open for the document id.
            UnsupportedOperationError: When the driver rejects the op.
        """
        if isinstance(op, dict):
            operation = DocumentOperation.model_validate(op)
        else:
            operation = op

        opened = self._sessions.get(operation.document_id)
        if opened is None:
            raise DriverError(
                f"No open session for document {operation.document_id}"
            )

        assert_op_allowed(opened.driver.manifest, operation)
        opened.driver.apply_operation(opened.session, operation)

    def finalize_all(self) -> list[ArtifactRecord]:
        """Finalize, serialize, hash, and return artifact records.

        Returns:
            Artifact records for every open document session.
        """
        records: list[ArtifactRecord] = []
        for opened in self._sessions.values():
            # Finalize and capture serialized bytes plus optional preview.
            opened.driver.finalize(opened.session)
            payload = opened.driver.serialize(opened.session)
            opened.payload = payload
            opened.preview = opened.driver.preview(opened.session)
            records.append(
                ArtifactRecord(
                    documentId=opened.document_id,
                    path=opened.output_target,
                    mediaType=opened.media_type,
                    digestSha256=hash_bytes(payload),
                    byteLength=len(payload),
                    templateId=opened.template_id,
                    templateVersion=opened.template_version,
                    driverId=opened.driver.driver_id,
                    driverVersion=opened.driver.manifest.version,
                )
            )
        return records

    def payloads(self) -> dict[str, bytes]:
        """Return serialized payloads keyed by document id.

        Returns:
            Mapping of document id to artifact bytes after finalize.
        """
        return {
            item.document_id: item.payload
            for item in self._sessions.values()
            if item.payload is not None
        }

    def previews(self) -> dict[str, DocumentPreview]:
        """Return previews keyed by document id.

        Returns:
            Mapping of document id to backend or UTF-8 text fallback preview.
        """
        now = datetime.now(UTC).isoformat()
        result: dict[str, DocumentPreview] = {}

        for item in self._sessions.values():
            if item.preview is not None:
                result[item.document_id] = item.preview
            elif item.payload is not None:
                # Fallback text preview for UTF-8 payloads.
                try:
                    body = item.payload.decode("utf-8")
                except UnicodeDecodeError:
                    continue

                result[item.document_id] = DocumentPreview(
                    documentId=item.document_id,
                    mode="text",
                    body=body,
                    warnings=[],
                    generatedAt=now,
                    renderer={
                        "package": item.driver.driver_id,
                        "version": item.driver.manifest.version,
                    },
                )

        return result
