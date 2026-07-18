"""Canonical mapping between schemas/ and dual-runtime bindings."""

from dataclasses import dataclass


@dataclass(frozen=True)
class SchemaBinding:
    """Links one canonical JSON Schema file to optional runtime bindings.

    Attributes:
        relpath: Path under ``schemas/`` (for example
            ``project.schema.json``).
        embed_key: Key in ``@roborean/spec`` ``EMBEDDED_SCHEMAS``, if the
            schema is shipped to the browser bundle.
        pydantic_model: ``roborean_spec.models`` class name, if Python
            validates instances through Pydantic.
        zod_export: Exported Zod schema name in ``@roborean/spec`` when
            TypeScript uses hand-written Zod (subset of schemas).
        check_top_level: When true and ``pydantic_model`` is set, verify
            required JSON properties align with model serialization keys.
    """

    relpath: str
    embed_key: str | None = None
    pydantic_model: str | None = None
    zod_export: str | None = None
    check_top_level: bool = True


# Registry of schemas that intentionally have no Pydantic/Zod twin yet.
SCHEMA_ONLY_RELPATHS = frozenset(
    {
        "meta/schema-version.json",
        "project-package.schema.json",
        "project-lock.schema.json",
        "preview.schema.json",
        "workspace.schema.json",
    }
)

SCHEMA_BINDINGS: tuple[SchemaBinding, ...] = (
    SchemaBinding("workspace-value.schema.json", embed_key="workspace-value"),
    SchemaBinding("secret-ref.schema.json", embed_key="secret-ref"),
    SchemaBinding(
        "variable.schema.json",
        embed_key="variable",
        pydantic_model="Variable",
    ),
    SchemaBinding("workspace.schema.json", embed_key="workspace"),
    SchemaBinding(
        "rule-ast.schema.json",
        embed_key="rule-ast",
        pydantic_model="RuleAst",
        zod_export="ruleSchema",
        check_top_level=False,
    ),
    SchemaBinding(
        "bit.schema.json",
        embed_key="bit",
        pydantic_model="Bit",
        zod_export="bitSchema",
    ),
    SchemaBinding(
        "bit-type-manifest.schema.json",
        embed_key="bit-type-manifest",
        pydantic_model="BitTypeManifest",
    ),
    SchemaBinding(
        "document-definition.schema.json",
        embed_key="document-definition",
        pydantic_model="DocumentDefinition",
    ),
    SchemaBinding(
        "recipe.schema.json",
        embed_key="recipe",
        pydantic_model="Recipe",
    ),
    SchemaBinding(
        "workspace-patch.schema.json",
        embed_key="workspace-patch",
        pydantic_model="WorkspacePatch",
    ),
    SchemaBinding(
        "compiled-project.schema.json",
        embed_key="compiled-project",
        pydantic_model="CompiledProject",
    ),
    SchemaBinding(
        "run-results.schema.json",
        embed_key="run-results",
        pydantic_model="RunResults",
    ),
    SchemaBinding(
        "project.schema.json",
        embed_key="project",
        pydantic_model="Project",
        zod_export="projectSchema",
    ),
    SchemaBinding(
        "run-request.schema.json",
        pydantic_model="RunRequest",
        zod_export="runRequestSchema",
    ),
    SchemaBinding(
        "run-record.schema.json",
        pydantic_model="RunRecord",
    ),
    SchemaBinding(
        "run-diff.schema.json",
        pydantic_model="RunDiff",
        zod_export="runDiffSchema",
    ),
    SchemaBinding(
        "template-manifest.schema.json",
        pydantic_model="TemplateManifest",
    ),
    SchemaBinding(
        "document-driver-manifest.schema.json",
        pydantic_model="DocumentDriverManifest",
    ),
    SchemaBinding(
        "document-preview.schema.json",
        pydantic_model="DocumentPreview",
    ),
    SchemaBinding(
        "artifacts/artifact-record.schema.json",
        pydantic_model="ArtifactRecord",
    ),
    SchemaBinding(
        "document-operation.schema.json",
        pydantic_model="DocumentOperation",
        check_top_level=False,
    ),
)

# Conformance JSON used to prove jsonschema and Pydantic stay aligned.
PYDANTIC_FIXTURES: tuple[tuple[str, str, str], ...] = (
    ("project", "conformance/projects/01_minimal.json", "Project"),
    (
        "compiled-project",
        "conformance/runs/01_minimal/expected.compiled.json",
        "CompiledProject",
    ),
    (
        "run-results",
        "conformance/runs/01_minimal/expected.run-results.json",
        "RunResults",
    ),
    (
        "workspace-patch",
        "conformance/patches/set_and_unset.json",
        "WorkspacePatch",
    ),
    (
        "recipe",
        "conformance/recipes/set-and-copy-title.json",
        "Recipe",
    ),
)
