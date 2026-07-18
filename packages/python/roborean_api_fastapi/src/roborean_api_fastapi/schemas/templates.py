"""Template file API models."""

from pydantic import Field

from .common import ApiModel


class TemplateContentResponse(ApiModel):
    """Template file payload returned by the API.

    Attributes:
        template_id: Template identifier from the project table
            (``templateId`` alias).
        path: Relative package path for the template file.
        content_base64: Base64-encoded template bytes
            (``contentBase64`` alias).
        text: UTF-8 decoded body when the file is textual.
    """

    template_id: str = Field(alias="templateId")
    path: str
    content_base64: str = Field(alias="contentBase64")
    text: str | None = None


class TemplateContentUpdate(ApiModel):
    """Replace one template file.

    Attributes:
        text: UTF-8 template body for text-like templates.
        content_base64: Base64-encoded bytes for binary templates
            (``contentBase64`` alias).
    """

    text: str | None = None
    content_base64: str | None = Field(default=None, alias="contentBase64")
