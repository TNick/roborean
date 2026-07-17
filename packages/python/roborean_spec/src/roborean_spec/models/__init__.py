"""Pydantic models for the canonical Roborean project format."""

from enum import Enum
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field


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
    Union[PublicLiteral, SecretRefValue, EqToken, ShapeToken, Bucket, Redacted],
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


class DocumentDefinition(Model):
    """A deferred document output definition."""

    id: str
    type: str
    template_ref: str = Field(alias="templateRef")
    driver: str
    output_target: str | None = Field(default=None, alias="outputTarget")
    settings: dict[str, Any] = Field(default_factory=dict)


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

    schema_version: Literal["1.0.0"] = Field(alias="schemaVersion")
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

    schema_version: Literal["1.0.0"] = Field(alias="schemaVersion")
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
