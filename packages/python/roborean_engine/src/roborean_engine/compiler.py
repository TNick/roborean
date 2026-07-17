"""Project compiler for deterministic Phase 1 execution."""

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from jsonschema import Draft202012Validator, ValidationError
from roborean_spec import (
    CompiledProject,
    Project,
    RuleAst,
    project_to_dict,
    validate_instance,
)

from .bits.registry import BitTypeRegistry, builtin_registry
from .diagnostics import (
    E_CONFIG,
    E_RULE_TYPE,
    E_UNDECLARED_WRITE,
    E_UNKNOWN_BIT_TYPE,
    W_DEAD_BIT,
    W_UNUSED_VARIABLE,
    Diagnostic,
)
from .documents import compile_documents
from .rules.parser import parse_rule
from .rules.profile import RULE_PROFILE_VERSION
from .rules.typecheck import RuleTypeError, typecheck_rule
from .version import ENGINE_VERSION


class CompileError(ValueError):
    """Raised when one or more error diagnostics prevent compilation."""

    def __init__(self, diagnostics: list[Diagnostic]) -> None:
        """Preserve diagnostics for CLI and test callers."""
        super().__init__("Project compilation failed")
        self.diagnostics = diagnostics


@dataclass(frozen=True)
class CompileOptions:
    """Controls strictness for project compilation."""

    strict_undeclared_access: bool = True
    allow_unresolved_documents: bool = False
    package_dir: Path | None = None


def compute_project_digest(project: Project) -> str:
    """Hash the canonical JSON project representation."""
    payload = json.dumps(
        project_to_dict(project),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def build_dependency_map(project: Project) -> dict[str, dict[str, list[str]]]:
    """Build declared dependency edges keyed by bit ID."""
    return {
        bit.id: {
            "reads": list(bit.reads),
            "writes": list(bit.writes),
            "emits": list(bit.emits),
        }
        for bit in project.bits
    }


def compile_project(
    project: Project,
    *,
    options: CompileOptions | None = None,
    bit_registry: BitTypeRegistry | None = None,
) -> CompiledProject:
    """Resolve manifests, validate bits, and produce a compiled project."""
    options = options or CompileOptions()
    registry = bit_registry or builtin_registry()
    diagnostics: list[Diagnostic] = []
    variables = {variable.key: variable for variable in project.variables}
    activation_expressions: dict[str, RuleAst] = {}
    plugin_versions: dict[str, str] = {}

    # Resolve each type and validate its independently versioned config.
    for index, bit in enumerate(project.bits):
        path = f"/bits/{index}"
        try:
            manifest, _ = registry.get(bit.type)
        except KeyError:
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_UNKNOWN_BIT_TYPE,
                    f"Unknown bit type: {bit.type}",
                    path,
                )
            )
            continue
        plugin_versions[bit.type] = manifest.version
        try:
            config_schema = dict(manifest.config_schema)
            properties = dict(config_schema.get("properties", {}))
            if "value" in properties:
                properties["value"] = {}
                config_schema["properties"] = properties
            Draft202012Validator(config_schema).validate(bit.config)
            if bit.type == "roborean.set_variable":
                validate_instance("workspace-value", bit.config["value"])
        except ValidationError as error:
            diagnostics.append(
                Diagnostic("error", E_CONFIG, error.message, f"{path}/config")
            )
        if options.strict_undeclared_access:
            for key in [*bit.reads, *bit.writes]:
                if key not in variables:
                    diagnostics.append(
                        Diagnostic(
                            "error",
                            E_UNDECLARED_WRITE,
                            f"Bit declares unknown workspace key: {key}",
                            path,
                        )
                    )
            if bit.type == "roborean.set_variable":
                config_key = bit.config.get("key")
                if (
                    isinstance(config_key, str)
                    and config_key not in bit.writes
                ):
                    diagnostics.append(
                        Diagnostic(
                            "error",
                            E_UNDECLARED_WRITE,
                            f"Bit writes undeclared key: {config_key}",
                            path,
                        )
                    )
            if bit.type == "roborean.copy_variable":
                config_to = bit.config.get("to")
                if isinstance(config_to, str) and config_to not in bit.writes:
                    diagnostics.append(
                        Diagnostic(
                            "error",
                            E_UNDECLARED_WRITE,
                            f"Bit writes undeclared key: {config_to}",
                            path,
                        )
                    )

        # Typecheck explicit and normalized always-active activation rules.
        rule = (
            RuleAst(op="const", args=[True])
            if bit.when is True
            else parse_rule(bit.when.model_dump())
        )
        activation_expressions[bit.id] = rule
        try:
            typecheck_rule(rule, variables)
        except RuleTypeError as error:
            diagnostics.append(
                Diagnostic("error", E_RULE_TYPE, str(error), f"{path}/when")
            )
        if rule.op == "const" and rule.args == [False]:
            diagnostics.append(
                Diagnostic(
                    "warning",
                    W_DEAD_BIT,
                    "Bit activation rule is always false",
                    f"{path}/when",
                )
            )

    # Surface unused declarations as warnings without blocking valid projects.
    used = {key for bit in project.bits for key in [*bit.reads, *bit.writes]}
    for variable in project.variables:
        if variable.key not in used:
            diagnostics.append(
                Diagnostic(
                    "warning",
                    W_UNUSED_VARIABLE,
                    f"Variable is never read or written: {variable.key}",
                )
            )
    if project.documents:
        if options.allow_unresolved_documents:
            diagnostics.append(
                Diagnostic(
                    "warning",
                    E_CONFIG,
                    "Document validation skipped (allow_unresolved_documents)",
                    "/documents",
                )
            )
        else:
            diagnostics.extend(
                compile_documents(
                    project,
                    package_dir=options.package_dir,
                )
            )
    if any(item.severity == "error" for item in diagnostics):
        raise CompileError(diagnostics)

    # Preserve resolved runtime data in the schema-shaped compiled artifact.
    return CompiledProject(
        schemaVersion=project.schema_version,
        projectId=project.id,
        projectName=project.name,
        compiledAt=datetime.now(UTC).isoformat(),
        engineVersion=ENGINE_VERSION,
        ruleProfileVersion=RULE_PROFILE_VERSION,
        digest=compute_project_digest(project),
        variables=project.variables,
        bits=[
            bit.model_dump(mode="json", by_alias=True) for bit in project.bits
        ],
        activationExpressions=activation_expressions,
        dependencyMap=build_dependency_map(project),
        documents=project.documents,
        templates=project.templates,
        pluginVersions=plugin_versions,
        diagnostics=[item.to_dict() for item in diagnostics],
    )
