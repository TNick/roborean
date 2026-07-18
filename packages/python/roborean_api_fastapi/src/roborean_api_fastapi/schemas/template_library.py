"""Template library API models."""

from typing import Any, Literal

from pydantic import Field

from .common import ApiModel
from .templates import TemplateContentResponse


class RequiredBitTypeSummary(ApiModel):
    """Required bit type row for recipe catalog entries.

    Attributes:
        type_id: Bit type identifier (``typeId`` alias).
        name: Human-readable bit type name.
    """

    type_id: str = Field(alias="typeId")
    name: str


class TemplateLibraryEntry(ApiModel):
    """Summary row for one catalog entry.

    Attributes:
        id: Stable catalog entry identifier.
        kind: Entry kind: document, starter, or recipe.
        title: Human-readable catalog title.
        description: Optional longer description.
        document_type: Document type for document entries
            (``documentType`` alias).
        driver: Document driver id for document entries.
        ir_family: Intermediate representation family for documents
            (``irFamily`` alias).
        tags: Optional discovery tags.
        template_version: Template semver for document entries
            (``templateVersion`` alias).
        required_inputs: Named template inputs for document entries
            (``requiredInputs`` alias).
        capabilities: Declared document capabilities for document entries.
        path: Relative template path for document entries.
        media_type: MIME type for document template bytes
            (``mediaType`` alias).
        variable_count: Variable count for starters and recipes
            (``variableCount`` alias).
        bit_count: Bit count for starters and recipes (``bitCount`` alias).
        document_count: Document count for starters and recipes
            (``documentCount`` alias).
        required_bit_types: Required bit types for recipe entries
            (``requiredBitTypes`` alias).
    """

    id: str
    kind: Literal["document", "starter", "recipe"]
    title: str
    description: str | None = None
    document_type: str | None = Field(default=None, alias="documentType")
    driver: str | None = None
    ir_family: str | None = Field(default=None, alias="irFamily")
    tags: list[str] = Field(default_factory=list)
    template_version: str | None = Field(default=None, alias="templateVersion")
    required_inputs: list[str] = Field(
        default_factory=list, alias="requiredInputs"
    )
    capabilities: list[str] = Field(default_factory=list)
    path: str | None = None
    media_type: str | None = Field(default=None, alias="mediaType")
    variable_count: int | None = Field(default=None, alias="variableCount")
    bit_count: int | None = Field(default=None, alias="bitCount")
    document_count: int | None = Field(default=None, alias="documentCount")
    required_bit_types: list[RequiredBitTypeSummary] = Field(
        default_factory=list, alias="requiredBitTypes"
    )


class TemplateLibraryDetail(TemplateLibraryEntry):
    """Full catalog entry with optional payload bodies.

    Attributes:
        manifest: Parsed template manifest for document entries.
        project: Starter project document for starter entries.
        recipe: Recipe document for recipe entries.
    """

    manifest: dict[str, Any] | None = None
    project: dict[str, Any] | None = None
    recipe: dict[str, Any] | None = None


TemplateLibraryContentResponse = TemplateContentResponse
