"""Pydantic models for the canonical Roborean project format."""

from enum import Enum
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Model(BaseModel):
    """Base model that mirrors schemas without extra properties."""

    model_config = ConfigDict(extra="forbid")


class PublicLiteral(Model):
    """A public literal workspace value."""

    kind: Literal["public_literal"]
    data_type: Literal["string", "number", "boolean", "date"] = Field(
        alias="dataType"
    )
    value: Any


class SecretRefValue(Model):
    """A reference to a secret held outside the portable project."""

    kind: Literal["secret_ref"]
    ref: str
    display_hint: str | None = Field(default=None, alias="displayHint")


class EqToken(Model):
    """An equality-preserving opaque token."""

    kind: Literal["eq_token"]
    token: str
    domain: str | None = None


class ShapeToken(Model):
    """A value represented by its structural shape."""

    kind: Literal["shape_token"]
    shape: Literal["email", "phone", "iban", "uuid", "code"]
    length: int | None = None


class Bucket(Model):
    """A bucketed value with optional numeric bounds."""

    kind: Literal["bucket"]
    bucket: str
    bounds: tuple[float, float] | None = None


class Redacted(Model):
    """A value withheld by secret or policy rules."""

    kind: Literal["redacted"]
    reason: Literal["secret", "policy", "consent", "unknown"]


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
    """Controls whether a workspace value can reach clients."""

    BACKEND_ONLY = "backendOnly"
    REDACTED_TO_CLIENT = "redactedToClient"
    CLIENT_VISIBLE = "clientVisible"


class Variable(Model):
    """A declared workspace variable."""

    key: str
    schema_: dict[str, Any] = Field(alias="schema")
    default_value: WorkspaceValue = Field(alias="defaultValue")
    const: bool = False
    exposure: Exposure
    description: str | None = None


class RuleAst(Model):
    """A recursive CEL-profile rule expression."""

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
    """Classifies a bit's execution effects."""

    PURE = "pure"
    WORKSPACE = "workspace"
    DOCUMENT = "document"
    FILESYSTEM = "filesystem"
    NETWORK = "network"
    EXTERNAL_PROCESS = "external-process"
    TRANSACTIONAL_EXTERNAL = "transactional-external"


class OnError(str, Enum):
    """Controls a run after a failed bit."""

    ABORT = "abort"
    SKIP = "skip"
    CONTINUE = "continue"


class Bit(Model):
    """An ordered conditional unit of project work."""

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
    """Preview configuration for a document definition."""

    mode: Literal["none", "text", "html", "drawing-json"]
    enabled: bool


class DocumentDefinition(Model):
    """A deferred document output definition."""

    id: str
    type: Literal["text", "markdown", "xlsx", "docx", "image", "dxf"]
    template_ref: str = Field(alias="templateRef")
    template_manifest_ref: str | None = Field(
        default=None, alias="templateManifestRef"
    )
    driver: str
    output_target: str | None = Field(default=None, alias="outputTarget")
    ir_family: (
        Literal["flow", "sheet", "drawing", "raster", "plain"] | None
    ) = Field(default=None, alias="irFamily")
    settings: dict[str, Any] = Field(default_factory=dict)
    preview: DocumentPreviewSettings | None = None


class TemplateSlot(Model):
    """A declared template slot."""

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
    """Sidecar metadata for a document template."""

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
    """Capability advertisement for an installed document driver."""

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
    """Renderer-owned preview payload."""

    document_id: str = Field(alias="documentId")
    mode: Literal["text", "html", "drawing-json"]
    body: Any
    warnings: list[str]
    generated_at: str = Field(alias="generatedAt")
    renderer: dict[str, str]


class ArtifactRecord(Model):
    """One generated document artifact referenced from run results."""

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
    """A typed document operation emitted by a bit."""

    model_config = ConfigDict(extra="allow")

    document_id: str = Field(alias="documentId")
    op: str


class SetOp(Model):
    """Set one workspace key."""

    op: Literal["set"]
    key: str
    value: WorkspaceValue


class UnsetOp(Model):
    """Remove one workspace key."""

    op: Literal["unset"]
    key: str


class RejectOp(Model):
    """Record a rejected workspace mutation."""

    op: Literal["reject"]
    key: str
    reason: str


PatchOp = Annotated[
    Union[SetOp, UnsetOp, RejectOp],
    Field(discriminator="op"),
]


class WorkspacePatch(Model):
    """An ordered, auditable list of workspace mutations."""

    ops: list[PatchOp]


class BitTypeManifest(Model):
    """Describes an installed bit implementation."""

    type_id: str = Field(alias="typeId")
    version: str
    config_schema: dict[str, Any] = Field(alias="configSchema")
    effect_class: EffectClass = Field(alias="effectClass")
    capabilities: list[str]
    reads_from_config: bool = Field(default=False, alias="readsFromConfig")
    browser_safe: bool = Field(alias="browserSafe")


class Project(Model):
    """A portable, versioned Roborean project."""

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
        """Return declared workspace variables."""
        return self.workspace["variables"]


class BitResult(Model):
    """The recorded result of one bit execution."""

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
    """A resolved project ready for deterministic execution."""

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
    """The portable output record for a Phase 1 execution."""

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
    """How a durable run was requested."""

    CLI = "cli"
    API = "api"
    RETRY = "retry"
    TEST = "test"


class RunRequest(Model):
    """Idempotent request to execute a project."""

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
        """Reject empty or oversized keys early."""
        if not value or len(value) > 128:
            raise ValueError("idempotencyKey must be 1..128 characters")
        return value


class WorkspaceChange(Model):
    """One workspace key delta for a run diff."""

    key: str
    before: WorkspaceValue | None
    after: WorkspaceValue | None


class SecretRefAccess(Model):
    """Metadata that a secret reference was touched without revealing it."""

    bit_id: str = Field(alias="bitId")
    provider: str
    name: str
    version: str | None = None


class RunDiff(Model):
    """Redacted provenance summary for a completed run."""

    workspace_changes: list[WorkspaceChange] = Field(alias="workspaceChanges")
    bits_activated: list[str] = Field(alias="bitsActivated")
    bits_skipped_inactive: list[str] = Field(alias="bitsSkippedInactive")
    bits_failed: list[str] = Field(alias="bitsFailed")
    secret_refs_accessed: list[SecretRefAccess] = Field(
        alias="secretRefsAccessed"
    )
    document_ops_count: dict[str, int] = Field(alias="documentOpsCount")


class RunError(Model):
    """Structured failure information for a durable run."""

    code: str
    message: str
    bit_id: str | None = Field(default=None, alias="bitId")


class RunStatus(str, Enum):
    """Lifecycle status for a durable run record."""

    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunRecord(Model):
    """Durable envelope around compile/run artifacts."""

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
