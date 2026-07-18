"""Schema-backed models and migration helpers for Roborean."""

from typing import Any

from .migrations import migrate_project
from .models import (
    ArtifactRecord,
    Bit,
    BitResult,
    BitTypeManifest,
    CompiledProject,
    DocumentDefinition,
    DocumentDriverManifest,
    DocumentOperation,
    DocumentPreview,
    DocumentPreviewSettings,
    EffectClass,
    Exposure,
    OnError,
    Project,
    PublicLiteral,
    Recipe,
    RecipeInsertPolicy,
    Redacted,
    RejectOp,
    RequiredBitType,
    RuleAst,
    RunDiff,
    RunError,
    RunRecord,
    RunRequest,
    RunResults,
    RunStatus,
    RunTrigger,
    SecretRefAccess,
    SecretRefValue,
    SetOp,
    TemplateManifest,
    TemplateSlot,
    UnsetOp,
    Variable,
    WorkspaceChange,
    WorkspacePatch,
    WorkspaceValue,
)
from .schema_loader import (
    find_repo_root,
    load_schema,
    schema_dir,
    validate_instance,
)

__version__ = "0.3.0"


def project_from_dict(data: dict[str, Any]) -> Project:
    """Validate and construct a project model from JSON-compatible data.

    Args:
        data: Raw project JSON object.

    Returns:
        Validated ``Project`` model instance.
    """
    validate_instance("project", data)
    return Project.model_validate(data)


def project_to_dict(project: Project) -> dict[str, Any]:
    """Return a JSON-compatible, schema-shaped project dictionary.

    Args:
        project: Project model to serialize.

    Returns:
        CamelCase JSON-compatible mapping with null optionals omitted.
    """
    return project.model_dump(mode="json", by_alias=True, exclude_none=True)


__all__ = [
    "ArtifactRecord",
    "Bit",
    "BitResult",
    "BitTypeManifest",
    "CompiledProject",
    "DocumentDefinition",
    "DocumentDriverManifest",
    "DocumentOperation",
    "DocumentPreview",
    "DocumentPreviewSettings",
    "EffectClass",
    "Exposure",
    "OnError",
    "Project",
    "PublicLiteral",
    "Recipe",
    "RecipeInsertPolicy",
    "Redacted",
    "RejectOp",
    "RequiredBitType",
    "RuleAst",
    "RunDiff",
    "RunError",
    "RunRecord",
    "RunRequest",
    "RunResults",
    "RunStatus",
    "RunTrigger",
    "SecretRefAccess",
    "SecretRefValue",
    "SetOp",
    "TemplateManifest",
    "TemplateSlot",
    "UnsetOp",
    "Variable",
    "WorkspaceChange",
    "WorkspacePatch",
    "WorkspaceValue",
    "find_repo_root",
    "load_schema",
    "migrate_project",
    "project_from_dict",
    "project_to_dict",
    "schema_dir",
    "validate_instance",
]
