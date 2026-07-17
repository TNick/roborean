"""Pydantic models for the canonical Roborean project format."""

from enum import Enum
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Model(BaseModel):
    """Base model that mirrors schemas without extra properties.

    Attributes:
        model_config: Pydantic configuration forbidding fields that are
            not declared on the model.
    """

    model_config = ConfigDict(extra="forbid")


class PublicLiteral(Model):
    """A public literal workspace value.

    Attributes:
        kind: Discriminator identifying this value as a public literal.
        data_type: The literal's declared type (``dataType`` alias): one
            of ``string``, ``number``, ``boolean``, or ``date``.
        value: The literal value itself.
    """

    kind: Literal["public_literal"]
    data_type: Literal["string", "number", "boolean", "date"] = Field(
        alias="dataType"
    )
    value: Any


class SecretRefValue(Model):
    """A reference to a secret held outside the portable project.

    Attributes:
        kind: Discriminator identifying this value as a secret
            reference.
        ref: Opaque identifier used to resolve the secret at run time.
        display_hint: Optional human-readable hint (``displayHint``
            alias) shown in place of the secret value.
    """

    kind: Literal["secret_ref"]
    ref: str
    display_hint: str | None = Field(default=None, alias="displayHint")


class EqToken(Model):
    """An equality-preserving opaque token.

    Attributes:
        kind: Discriminator identifying this value as an equality token.
        token: The opaque token value used for equality comparisons.
        domain: Optional domain that scopes the token's equality
            semantics.
    """

    kind: Literal["eq_token"]
    token: str
    domain: str | None = None


class ShapeToken(Model):
    """A value represented by its structural shape.

    Attributes:
        kind: Discriminator identifying this value as a shape token.
        shape: The structural shape category, one of ``email``,
            ``phone``, ``iban``, ``uuid``, or ``code``.
        length: Optional length constraint for the underlying value.
    """

    kind: Literal["shape_token"]
    shape: Literal["email", "phone", "iban", "uuid", "code"]
    length: int | None = None


class Bucket(Model):
    """A bucketed value with optional numeric bounds.

    Attributes:
        kind: Discriminator identifying this value as a bucket.
        bucket: Identifier of the bucket the value falls into.
        bounds: Optional inclusive lower and upper numeric bounds for
            the bucket.
    """

    kind: Literal["bucket"]
    bucket: str
    bounds: tuple[float, float] | None = None


class Redacted(Model):
    """A value withheld by secret or policy rules.

    Attributes:
        kind: Discriminator identifying this value as redacted.
        reason: Why the value was withheld, one of ``secret``,
            ``policy``, ``consent``, or ``unknown``.
    """

    kind: Literal["redacted"]
    reason: Literal["secret", "policy", "consent", "unknown"]


# A workspace value discriminated by its `kind` field; one of
# PublicLiteral, SecretRefValue, EqToken, ShapeToken, Bucket, or
# Redacted.
WorkspaceValue = Annotated[
    Union[
        PublicLiteral,
        SecretRefValue,
        EqToken,
        ShapeToken,
        Bucket,
        Redacted,
    ],
    Field(discriminator="kind"),
]


class Exposure(str, Enum):
    """Controls whether a workspace value can reach clients.

    Attributes:
        BACKEND_ONLY: The value never leaves the backend.
        REDACTED_TO_CLIENT: The value reaches the client only after
            redaction.
        CLIENT_VISIBLE: The value may be sent to the client as-is.
    """

    BACKEND_ONLY = "backendOnly"
    REDACTED_TO_CLIENT = "redactedToClient"
    CLIENT_VISIBLE = "clientVisible"


class Variable(Model):
    """A declared workspace variable.

    Attributes:
        key: The variable's unique workspace key.
        schema_: JSON Schema (``schema`` alias) describing valid values.
        default_value: Default workspace value (``defaultValue`` alias)
            used when no override is provided.
        const: Whether the variable's value is immutable once set.
        exposure: Client-visibility policy for the variable's value.
        description: Optional human-readable description of the
            variable.
    """

    key: str
    schema_: dict[str, Any] = Field(alias="schema")
    default_value: WorkspaceValue = Field(alias="defaultValue")
    const: bool = False
    exposure: Exposure
    description: str | None = None


class RuleAst(Model):
    """A recursive CEL-profile rule expression.

    Attributes:
        op: The operator for this expression node, one of ``and``,
            ``or``, ``not``, ``eq``, ``ne``, ``lt``, ``le``, ``gt``,
            ``ge``, ``has``, ``const``, or ``var``.
        args: Operands for the operator, which may themselves be nested
            rule expressions or literal values.
    """

    op: Literal[
        "and",
        "or",
        "not",
        "eq",
        "ne",
        "lt",
        "le",
        "gt",
        "ge",
        "has",
        "const",
        "var",
    ]
    args: list[Any]


class EffectClass(str, Enum):
    """Classifies a bit's execution effects.

    Attributes:
        PURE: No observable side effects.
        WORKSPACE: Mutates the workspace only.
        DOCUMENT: Emits document operations.
        FILESYSTEM: Reads or writes the local filesystem.
        NETWORK: Performs network I/O.
        EXTERNAL_PROCESS: Invokes an external process.
        TRANSACTIONAL_EXTERNAL: Calls an external system that supports
            transactional semantics.
    """

    PURE = "pure"
    WORKSPACE = "workspace"
    DOCUMENT = "document"
    FILESYSTEM = "filesystem"
    NETWORK = "network"
    EXTERNAL_PROCESS = "external-process"
    TRANSACTIONAL_EXTERNAL = "transactional-external"


class OnError(str, Enum):
    """Controls a run after a failed bit.

    Attributes:
        ABORT: Stop the run immediately.
        SKIP: Skip the failed bit and continue.
        CONTINUE: Continue the run despite the failure.
    """

    ABORT = "abort"
    SKIP = "skip"
    CONTINUE = "continue"


class Bit(Model):
    """An ordered conditional unit of project work.

    Attributes:
        id: Unique identifier of the bit within the project.
        type: The bit type implementation to execute.
        label: Optional human-readable label for the bit.
        when: Activation condition; either always-true or a rule
            expression evaluated against the workspace.
        config: Bit-specific configuration payload.
        reads: Workspace keys the bit declares it reads.
        writes: Workspace keys the bit declares it writes.
        emits: Document operation kinds the bit declares it emits.
        effect_class: Effect classification (``effectClass`` alias) used
            for retry and idempotency handling.
        on_error: Behavior to apply on failure (``onError`` alias).
        capabilities: Capability identifiers required to run the bit.
    """

    id: str
    type: str
    label: str | None = None
    when: Literal[True] | RuleAst
    config: dict[str, Any]
    reads: list[str]
    writes: list[str]
    emits: list[str]
    effect_class: EffectClass = Field(alias="effectClass")
    on_error: OnError = Field(alias="onError")
    capabilities: list[str]


class DocumentPreviewSettings(Model):
    """Preview configuration for a document definition.

    Attributes:
        mode: The preview rendering mode, one of ``none``, ``text``,
            ``html``, or ``drawing-json``.
        enabled: Whether preview generation is enabled.
    """

    mode: Literal["none", "text", "html", "drawing-json"]
    enabled: bool


class DocumentDefinition(Model):
    """A deferred document output definition.

    Attributes:
        id: Unique identifier of the document within the project.
        type: Document family, one of ``text``, ``markdown``, ``xlsx``,
            ``docx``, ``image``, or ``dxf``.
        template_ref: Reference to the template used to render the
            document (``templateRef`` alias).
        template_manifest_ref: Optional reference to the template's
            manifest (``templateManifestRef`` alias).
        driver: Identifier of the document driver used to render the
            document.
        output_target: Optional workspace key or path describing where
            the rendered artifact should be written (``outputTarget``
            alias).
        ir_family: Optional intermediate-representation family produced
            by the driver (``irFamily`` alias): one of ``flow``,
            ``sheet``, ``drawing``, ``raster``, or ``plain``.
        settings: Driver-specific rendering settings.
        preview: Optional preview configuration for the document.
    """

    id: str
    type: Literal["text", "markdown", "xlsx", "docx", "image", "dxf"]
    template_ref: str = Field(alias="templateRef")
    template_manifest_ref: str | None = Field(
        default=None, alias="templateManifestRef"
    )
    driver: str
    output_target: str | None = Field(default=None, alias="outputTarget")
    ir_family: Literal["flow", "sheet", "drawing", "raster", "plain"] | None = (
        Field(default=None, alias="irFamily")
    )
    settings: dict[str, Any] = Field(default_factory=dict)
    preview: DocumentPreviewSettings | None = None


class TemplateSlot(Model):
    """A declared template slot.

    Attributes:
        kind: The slot category, one of ``text``, ``richtext``,
            ``repeating_table``, ``image``, ``cell``, ``named_range``,
            ``block``, or ``layer``.
        required: Whether the slot must be filled for the template to
            be valid.
    """

    kind: Literal[
        "text",
        "richtext",
        "repeating_table",
        "image",
        "cell",
        "named_range",
        "block",
        "layer",
    ]
    required: bool = False


class TemplateManifest(Model):
    """Sidecar metadata for a document template.

    Attributes:
        template_id: Unique identifier of the template (``templateId``
            alias).
        template_version: Version of the template (``templateVersion``
            alias).
        document_type: Document family the template targets
            (``documentType`` alias): one of ``text``, ``markdown``,
            ``xlsx``, ``docx``, ``image``, or ``dxf``.
        driver: Identifier of the document driver the template targets.
        required_inputs: Workspace keys the template requires
            (``requiredInputs`` alias).
        capabilities: Capability identifiers required to render the
            template.
        declared_slots: Slots declared by the template, keyed by slot
            name (``declaredSlots`` alias).
        content_hash: Optional content hash used to detect template
            drift (``contentHash`` alias).
    """

    template_id: str = Field(alias="templateId")
    template_version: str = Field(alias="templateVersion")
    document_type: Literal[
        "text", "markdown", "xlsx", "docx", "image", "dxf"
    ] = Field(alias="documentType")
    driver: str
    required_inputs: list[str] = Field(alias="requiredInputs")
    capabilities: list[str]
    declared_slots: dict[str, TemplateSlot] = Field(alias="declaredSlots")
    content_hash: str | None = Field(default=None, alias="contentHash")


class DocumentDriverManifest(Model):
    """Capability advertisement for an installed document driver.

    Attributes:
        driver_id: Unique identifier of the driver (``driverId`` alias).
        version: Version of the driver.
        ir_family: Intermediate-representation family the driver
            produces (``irFamily`` alias): one of ``flow``, ``sheet``,
            ``drawing``, ``raster``, or ``plain``.
        capabilities: Capability identifiers the driver supports.
        supports_preview: Whether the driver supports preview
            generation (``supportsPreview`` alias).
        supports_browser_execution: Whether the driver can run in a
            browser runtime (``supportsBrowserExecution`` alias).
        supports_diff: Whether the driver supports diffing output
            (``supportsDiff`` alias).
        requires_backend: Whether the driver requires a backend runtime
            (``requiresBackend`` alias).
        template_media_types: Media types accepted for the driver's
            templates (``templateMediaTypes`` alias).
    """

    driver_id: str = Field(alias="driverId")
    version: str
    ir_family: Literal["flow", "sheet", "drawing", "raster", "plain"] = Field(
        alias="irFamily"
    )
    capabilities: list[str]
    supports_preview: bool = Field(alias="supportsPreview")
    supports_browser_execution: bool = Field(alias="supportsBrowserExecution")
    supports_diff: bool = Field(alias="supportsDiff")
    requires_backend: bool = Field(alias="requiresBackend")
    template_media_types: list[str] = Field(alias="templateMediaTypes")


class DocumentPreview(Model):
    """Renderer-owned preview payload.

    Attributes:
        document_id: Identifier of the document being previewed
            (``documentId`` alias).
        mode: The preview rendering mode, one of ``text``, ``html``, or
            ``drawing-json``.
        body: The rendered preview content.
        warnings: Non-fatal warnings produced while rendering the
            preview.
        generated_at: Timestamp when the preview was generated
            (``generatedAt`` alias).
        renderer: Metadata describing the renderer that produced the
            preview.
    """

    document_id: str = Field(alias="documentId")
    mode: Literal["text", "html", "drawing-json"]
    body: Any
    warnings: list[str]
    generated_at: str = Field(alias="generatedAt")
    renderer: dict[str, str]


class ArtifactRecord(Model):
    """One generated document artifact referenced from run results.

    Attributes:
        document_id: Identifier of the document that produced the
            artifact (``documentId`` alias).
        path: Storage path or key of the artifact.
        media_type: MIME type of the artifact (``mediaType`` alias).
        digest_sha256: SHA-256 digest of the artifact bytes
            (``digestSha256`` alias).
        byte_length: Size of the artifact in bytes (``byteLength``
            alias).
        template_id: Identifier of the template used to render the
            artifact (``templateId`` alias).
        template_version: Version of the template used to render the
            artifact (``templateVersion`` alias).
        driver_id: Identifier of the driver used to render the artifact
            (``driverId`` alias).
        driver_version: Version of the driver used to render the
            artifact (``driverVersion`` alias).
    """

    document_id: str = Field(alias="documentId")
    path: str
    media_type: str = Field(alias="mediaType")
    digest_sha256: str = Field(alias="digestSha256")
    byte_length: int = Field(alias="byteLength")
    template_id: str = Field(alias="templateId")
    template_version: str = Field(alias="templateVersion")
    driver_id: str = Field(alias="driverId")
    driver_version: str = Field(alias="driverVersion")


class DocumentOperation(Model):
    """A typed document operation emitted by a bit.

    Attributes:
        model_config: Pydantic configuration allowing extra fields,
            since operations carry driver-specific payloads.
        document_id: Identifier of the target document (``documentId``
            alias).
        op: The operation kind to apply to the document.
    """

    model_config = ConfigDict(extra="allow")

    document_id: str = Field(alias="documentId")
    op: str


class SetOp(Model):
    """Set one workspace key.

    Attributes:
        op: Discriminator identifying this operation as a set.
        key: Workspace key being set.
        value: New value assigned to the workspace key.
    """

    op: Literal["set"]
    key: str
    value: WorkspaceValue


class UnsetOp(Model):
    """Remove one workspace key.

    Attributes:
        op: Discriminator identifying this operation as an unset.
        key: Workspace key being removed.
    """

    op: Literal["unset"]
    key: str


class RejectOp(Model):
    """Record a rejected workspace mutation.

    Attributes:
        op: Discriminator identifying this operation as a reject.
        key: Workspace key whose mutation was rejected.
        reason: Human-readable reason the mutation was rejected.
    """

    op: Literal["reject"]
    key: str
    reason: str


# A single workspace patch operation discriminated by its `op` field;
# one of SetOp, UnsetOp, or RejectOp.
PatchOp = Annotated[
    Union[SetOp, UnsetOp, RejectOp],
    Field(discriminator="op"),
]


class WorkspacePatch(Model):
    """An ordered, auditable list of workspace mutations.

    Attributes:
        ops: Ordered sequence of patch operations to apply.
    """

    ops: list[PatchOp]


class BitTypeManifest(Model):
    """Describes an installed bit implementation.

    Attributes:
        type_id: Unique identifier of the bit type (``typeId`` alias).
        version: Version of the bit type implementation.
        config_schema: JSON Schema describing valid bit configuration
            (``configSchema`` alias).
        effect_class: Effect classification declared by the bit type
            (``effectClass`` alias).
        capabilities: Capability identifiers required to run the bit
            type.
        reads_from_config: Whether the bit type's declared reads depend
            on its configuration (``readsFromConfig`` alias).
        browser_safe: Whether the bit type can execute in a browser
            runtime (``browserSafe`` alias).
    """

    type_id: str = Field(alias="typeId")
    version: str
    config_schema: dict[str, Any] = Field(alias="configSchema")
    effect_class: EffectClass = Field(alias="effectClass")
    capabilities: list[str]
    reads_from_config: bool = Field(default=False, alias="readsFromConfig")
    browser_safe: bool = Field(alias="browserSafe")


class Project(Model):
    """A portable, versioned Roborean project.

    Attributes:
        schema_version: Schema version the project conforms to
            (``schemaVersion`` alias): one of ``1.0.0`` or ``1.1.0``.
        id: Unique identifier of the project.
        name: Human-readable project name.
        description: Optional human-readable project description.
        plugin_requirements: Plugin dependency declarations
            (``pluginRequirements`` alias).
        workspace: Declared workspace variables, keyed by group name.
        bits: Ordered list of bits that make up the project.
        documents: Document definitions produced by the project.
        templates: Template references used by the project's documents.
        metadata: Free-form project metadata.
        variables: Declared workspace variables, read from the
            ``variables`` group of `workspace`.
    """

    schema_version: Literal["1.0.0", "1.1.0"] = Field(alias="schemaVersion")
    id: str
    name: str
    description: str | None = None
    plugin_requirements: list[dict[str, str]] = Field(
        alias="pluginRequirements"
    )
    workspace: dict[str, list[Variable]]
    bits: list[Bit]
    documents: list[DocumentDefinition]
    templates: list[dict[str, str]]
    metadata: dict[str, Any]

    @property
    def variables(self) -> list[Variable]:
        """Return the declared workspace variables.

        Returns:
            The list of variables stored under the ``variables`` key of
            `workspace`.
        """
        return self.workspace["variables"]


class BitResult(Model):
    """The recorded result of one bit execution.

    Attributes:
        bit_id: Identifier of the executed bit (``bitId`` alias).
        type: The bit type that was executed.
        active: Whether the bit's activation condition evaluated to
            true.
        activation_reason: Why the bit was (or was not) active
            (``activationReason`` alias): a boolean or the literal
            ``always``.
        status: Outcome of the execution, one of ``success``,
            ``skipped``, ``failed``, or ``inactive``.
        duration_ms: Execution duration in milliseconds (``durationMs``
            alias).
        workspace_patch: Workspace mutations produced by the bit
            (``workspacePatch`` alias).
        document_ops: Document operations emitted by the bit
            (``documentOps`` alias).
        diagnostics: Diagnostic messages produced during execution.
        plugin_version: Version of the plugin that provided the bit
            type (``pluginVersion`` alias).
    """

    bit_id: str = Field(alias="bitId")
    type: str
    active: bool
    activation_reason: bool | Literal["always"] = Field(
        alias="activationReason"
    )
    status: Literal["success", "skipped", "failed", "inactive"]
    duration_ms: float = Field(alias="durationMs")
    workspace_patch: WorkspacePatch = Field(alias="workspacePatch")
    document_ops: list[Any] = Field(alias="documentOps")
    diagnostics: list[dict[str, Any]]
    plugin_version: str = Field(alias="pluginVersion")


class CompiledProject(Model):
    """A resolved project ready for deterministic execution.

    Attributes:
        schema_version: Schema version the project conforms to
            (``schemaVersion`` alias).
        project_id: Identifier of the source project (``projectId``
            alias).
        project_name: Name of the source project (``projectName``
            alias).
        compiled_at: Timestamp when compilation occurred (``compiledAt``
            alias).
        engine_version: Version of the engine that performed the
            compilation (``engineVersion`` alias).
        rule_profile_version: Version of the rule evaluation profile
            used (``ruleProfileVersion`` alias).
        digest: Content digest of the compiled project.
        variables: Resolved workspace variables.
        bits: Resolved bit definitions ready for execution.
        activation_expressions: Compiled activation rule expressions,
            keyed by bit id (``activationExpressions`` alias).
        dependency_map: Declared reads/writes/emits per bit, keyed by
            bit id (``dependencyMap`` alias).
        documents: Document definitions produced by the project.
        templates: Template references used by the project's documents.
        plugin_versions: Versions of plugins used to compile the
            project, keyed by plugin id (``pluginVersions`` alias).
        diagnostics: Diagnostic messages produced during compilation.
    """

    schema_version: Literal["1.0.0", "1.1.0"] = Field(alias="schemaVersion")
    project_id: str = Field(alias="projectId")
    project_name: str = Field(alias="projectName")
    compiled_at: str = Field(alias="compiledAt")
    engine_version: str = Field(alias="engineVersion")
    rule_profile_version: str = Field(alias="ruleProfileVersion")
    digest: str
    variables: list[Variable]
    bits: list[dict[str, Any]]
    activation_expressions: dict[str, RuleAst] = Field(
        alias="activationExpressions"
    )
    dependency_map: dict[str, dict[str, list[str]]] = Field(
        alias="dependencyMap"
    )
    documents: list[DocumentDefinition]
    templates: list[dict[str, str]]
    plugin_versions: dict[str, str] = Field(alias="pluginVersions")
    diagnostics: list[dict[str, Any]]


class RunResults(Model):
    """The portable output record for a Phase 1 execution.

    Attributes:
        run_id: Unique identifier of the run (``runId`` alias).
        project_id: Identifier of the executed project (``projectId``
            alias).
        project_digest: Content digest of the compiled project
            (``projectDigest`` alias).
        started_at: Timestamp when the run started (``startedAt``
            alias).
        finished_at: Timestamp when the run finished (``finishedAt``
            alias).
        status: Outcome of the run, one of ``success``, ``failed``, or
            ``aborted``.
        input_workspace_hash: Hash of the workspace before execution
            (``inputWorkspaceHash`` alias).
        final_workspace_hash: Hash of the workspace after execution
            (``finalWorkspaceHash`` alias).
        bit_results: Per-bit execution results (``bitResults`` alias).
        artifacts: Document artifacts produced by the run.
        engine_version: Version of the engine that executed the run
            (``engineVersion`` alias).
        rule_profile_version: Version of the rule evaluation profile
            used (``ruleProfileVersion`` alias).
    """

    run_id: str = Field(alias="runId")
    project_id: str = Field(alias="projectId")
    project_digest: str = Field(alias="projectDigest")
    started_at: str = Field(alias="startedAt")
    finished_at: str = Field(alias="finishedAt")
    status: Literal["success", "failed", "aborted"]
    input_workspace_hash: str = Field(alias="inputWorkspaceHash")
    final_workspace_hash: str = Field(alias="finalWorkspaceHash")
    bit_results: list[BitResult] = Field(alias="bitResults")
    artifacts: list[Any]
    engine_version: str = Field(alias="engineVersion")
    rule_profile_version: str = Field(alias="ruleProfileVersion")


class RunTrigger(str, Enum):
    """How a durable run was requested.

    Attributes:
        CLI: The run was requested from the command line.
        API: The run was requested through the API.
        RETRY: The run is a retry of a previous run.
        TEST: The run was requested by a test harness.
    """

    CLI = "cli"
    API = "api"
    RETRY = "retry"
    TEST = "test"


class RunRequest(Model):
    """Idempotent request to execute a project.

    Attributes:
        project_id: Identifier of the project to execute (``projectId``
            alias).
        project_revision: Optional revision of the project to execute
            (``projectRevision`` alias).
        idempotency_key: Client-supplied key used to deduplicate
            retries (``idempotencyKey`` alias).
        trigger: How the run was requested.
        workspace_overrides: Workspace values that override project
            defaults (``workspaceOverrides`` alias).
        strict_workspace_access: Whether undeclared workspace reads or
            writes should fail the run (``strictWorkspaceAccess``
            alias).
        retry_of_run_id: Optional identifier of the run being retried
            (``retryOfRunId`` alias).
        requested_at: Optional timestamp when the request was made
            (``requestedAt`` alias).
    """

    project_id: str = Field(alias="projectId")
    project_revision: str | None = Field(default=None, alias="projectRevision")
    idempotency_key: str = Field(alias="idempotencyKey")
    trigger: RunTrigger
    workspace_overrides: dict[str, WorkspaceValue] = Field(
        default_factory=dict, alias="workspaceOverrides"
    )
    strict_workspace_access: bool = Field(
        default=True, alias="strictWorkspaceAccess"
    )
    retry_of_run_id: str | None = Field(default=None, alias="retryOfRunId")
    requested_at: str | None = Field(default=None, alias="requestedAt")

    @field_validator("idempotency_key")
    @classmethod
    def _validate_idempotency_key(cls, value: str) -> str:
        """Reject empty or oversized idempotency keys early.

        Args:
            value: The candidate idempotency key to validate.

        Returns:
            The validated idempotency key, unchanged.

        Raises:
            ValueError: If `value` is empty or longer than 128
                characters.
        """
        if not value or len(value) > 128:
            raise ValueError("idempotencyKey must be 1..128 characters")
        return value


class WorkspaceChange(Model):
    """One workspace key delta for a run diff.

    Attributes:
        key: The workspace key that changed.
        before: The value before the run, or ``None`` if it was unset.
        after: The value after the run, or ``None`` if it was unset.
    """

    key: str
    before: WorkspaceValue | None
    after: WorkspaceValue | None


class SecretRefAccess(Model):
    """Metadata that a secret reference was touched without revealing it.

    Attributes:
        bit_id: Identifier of the bit that accessed the secret
            (``bitId`` alias).
        provider: Identifier of the secret provider.
        name: Name of the secret within the provider.
        version: Optional version of the secret that was accessed.
    """

    bit_id: str = Field(alias="bitId")
    provider: str
    name: str
    version: str | None = None


class RunDiff(Model):
    """Redacted provenance summary for a completed run.

    Attributes:
        workspace_changes: Workspace key deltas produced by the run
            (``workspaceChanges`` alias).
        bits_activated: Identifiers of bits whose activation condition
            was true (``bitsActivated`` alias).
        bits_skipped_inactive: Identifiers of bits skipped because they
            were inactive (``bitsSkippedInactive`` alias).
        bits_failed: Identifiers of bits that failed during execution
            (``bitsFailed`` alias).
        secret_refs_accessed: Secret references touched during the run
            (``secretRefsAccessed`` alias).
        document_ops_count: Number of document operations emitted,
            keyed by operation kind (``documentOpsCount`` alias).
    """

    workspace_changes: list[WorkspaceChange] = Field(alias="workspaceChanges")
    bits_activated: list[str] = Field(alias="bitsActivated")
    bits_skipped_inactive: list[str] = Field(alias="bitsSkippedInactive")
    bits_failed: list[str] = Field(alias="bitsFailed")
    secret_refs_accessed: list[SecretRefAccess] = Field(
        alias="secretRefsAccessed"
    )
    document_ops_count: dict[str, int] = Field(alias="documentOpsCount")


class RunError(Model):
    """Structured failure information for a durable run.

    Attributes:
        code: Machine-readable error code.
        message: Human-readable error message.
        bit_id: Optional identifier of the bit that caused the failure
            (``bitId`` alias).
    """

    code: str
    message: str
    bit_id: str | None = Field(default=None, alias="bitId")


class RunStatus(str, Enum):
    """Lifecycle status for a durable run record.

    Attributes:
        QUEUED: The run has been accepted but not started.
        RUNNING: The run is currently executing.
        SUCCEEDED: The run completed successfully.
        FAILED: The run completed with a failure.
        CANCELLED: The run was cancelled before completion.
    """

    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunRecord(Model):
    """Durable envelope around compile/run artifacts.

    Attributes:
        run_id: Unique identifier of the run (``runId`` alias).
        idempotency_key: Client-supplied key used to deduplicate
            retries (``idempotencyKey`` alias).
        project_id: Identifier of the project being executed
            (``projectId`` alias).
        project_revision: Revision of the project being executed
            (``projectRevision`` alias).
        compiled_digest: Content digest of the compiled project
            (``compiledDigest`` alias).
        status: Current lifecycle status of the run.
        request: The original run request.
        results: Optional portable results once the run finishes.
        diff: Optional redacted provenance summary once the run
            finishes.
        attempt: One-based attempt number for this run.
        retry_policy_snapshot: Retry policy in effect when the run was
            created (``retryPolicySnapshot`` alias).
        engine_version: Version of the engine executing the run
            (``engineVersion`` alias).
        plugin_versions: Versions of plugins used by the run, keyed by
            plugin id (``pluginVersions`` alias).
        error: Optional structured failure information.
        created_at: Timestamp when the run record was created
            (``createdAt`` alias).
        started_at: Optional timestamp when execution started
            (``startedAt`` alias).
        finished_at: Optional timestamp when execution finished
            (``finishedAt`` alias).
        request_digest: Digest used to detect duplicate requests
            (``requestDigest`` alias).
    """

    run_id: str = Field(alias="runId")
    idempotency_key: str = Field(alias="idempotencyKey")
    project_id: str = Field(alias="projectId")
    project_revision: str = Field(alias="projectRevision")
    compiled_digest: str = Field(alias="compiledDigest")
    status: RunStatus
    request: RunRequest
    results: RunResults | None = None
    diff: RunDiff | None = None
    attempt: int = 1
    retry_policy_snapshot: dict[str, Any] = Field(
        default_factory=dict, alias="retryPolicySnapshot"
    )
    engine_version: str = Field(alias="engineVersion")
    plugin_versions: dict[str, str] = Field(alias="pluginVersions")
    error: RunError | None = None
    created_at: str = Field(alias="createdAt")
    started_at: str | None = Field(default=None, alias="startedAt")
    finished_at: str | None = Field(default=None, alias="finishedAt")
    request_digest: str = Field(default="", alias="requestDigest")
