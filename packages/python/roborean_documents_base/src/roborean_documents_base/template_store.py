"""Load template bytes and manifests from a project package directory."""

import json
from pathlib import Path
from typing import Any

from roborean_spec import Project, TemplateManifest

from .errors import TemplateError


class DocumentTemplateStore:
    """Resolve templates by id from a project package root.

    Attributes:
        package_dir: Absolute project package directory.
        project: Project whose template table is indexed.

        _by_id: Template table entries keyed by template id.
    """

    package_dir: Path
    project: Project

    _by_id: dict[str, Any]

    def __init__(self, package_dir: Path, project: Project) -> None:
        """Bind to a package directory and project template table.

        Args:
            package_dir: Root directory containing template files.
            project: Project document with the templates table.
        """
        self.package_dir = package_dir
        self.project = project
        self._by_id = {item["id"]: item for item in project.templates}

    def resolve_path(self, template_ref: str) -> Path:
        """Return the absolute path for a template id.

        Args:
            template_ref: Template identifier from the project table.

        Returns:
            Absolute path to the template file on disk.

        Raises:
            TemplateError: When the template id or file is missing.
        """
        entry = self._by_id.get(template_ref)
        if entry is None:
            raise TemplateError(f"Unknown templateRef: {template_ref}")

        path = self.package_dir / entry["path"]
        if not path.is_file():
            raise TemplateError(f"Missing template file: {path}")

        return path

    def load_bytes(self, template_ref: str) -> bytes:
        """Read template bytes.

        Args:
            template_ref: Template identifier from the project table.

        Returns:
            Raw template file contents.
        """
        return self.resolve_path(template_ref).read_bytes()

    def load_manifest(
        self,
        template_ref: str,
        *,
        manifest_ref: str | None = None,
    ) -> TemplateManifest:
        """Load the sidecar template manifest.

        Args:
            template_ref: Template identifier used when deriving the
                default sidecar path.
            manifest_ref: Optional explicit relative path to the manifest.

        Returns:
            Validated template sidecar manifest.

        Raises:
            TemplateError: When the manifest file is missing.
        """
        if manifest_ref:
            path = self.package_dir / manifest_ref
        else:
            template_path = self.resolve_path(template_ref)
            path = template_path.with_suffix(
                template_path.suffix + ".manifest.json"
            )

            # Also accept templates/<id>.manifest.json next to stem.
            if not path.is_file():
                path = template_path.with_name(
                    template_path.stem + ".manifest.json"
                )

        if not path.is_file():
            raise TemplateError(f"Missing template manifest: {path}")

        data = json.loads(path.read_text(encoding="utf-8"))
        return TemplateManifest.model_validate(data)
