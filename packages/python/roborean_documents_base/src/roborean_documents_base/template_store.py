"""Load template bytes and manifests from a project package directory."""

import json
from pathlib import Path

from roborean_spec import Project, TemplateManifest

from .errors import TemplateError


class DocumentTemplateStore:
    """Resolve templates by id from a project package root."""

    def __init__(self, package_dir: Path, project: Project) -> None:
        """Bind to a package directory and project template table."""
        self.package_dir = package_dir
        self.project = project
        self._by_id = {item["id"]: item for item in project.templates}

    def resolve_path(self, template_ref: str) -> Path:
        """Return the absolute path for a template id."""
        entry = self._by_id.get(template_ref)
        if entry is None:
            raise TemplateError(f"Unknown templateRef: {template_ref}")
        path = self.package_dir / entry["path"]
        if not path.is_file():
            raise TemplateError(f"Missing template file: {path}")
        return path

    def load_bytes(self, template_ref: str) -> bytes:
        """Read template bytes."""
        return self.resolve_path(template_ref).read_bytes()

    def load_manifest(
        self,
        template_ref: str,
        *,
        manifest_ref: str | None = None,
    ) -> TemplateManifest:
        """Load the sidecar template manifest."""
        if manifest_ref:
            path = self.package_dir / manifest_ref
        else:
            template_path = self.resolve_path(template_ref)
            path = template_path.with_suffix(
                template_path.suffix + ".manifest.json"
            )
            if not path.is_file():
                # Also accept templates/<id>.manifest.json next to stem.
                path = template_path.with_name(
                    template_path.stem + ".manifest.json"
                )
        if not path.is_file():
            raise TemplateError(f"Missing template manifest: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        return TemplateManifest.model_validate(data)
