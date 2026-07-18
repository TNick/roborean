"""Compiler checks and driver registry helpers for documents."""

import logging
from pathlib import Path

from roborean_documents_base import DriverRegistry, load_entry_point_drivers
from roborean_documents_base.errors import TemplateError
from roborean_documents_base.template_store import DocumentTemplateStore
from roborean_spec import Project

from .bit_emitted_ops import emitted_ops_for_bit
from .diagnostics import E_CONFIG, Diagnostic

logger = logging.getLogger(__name__)

E_TEMPLATE_MISSING = "E_TEMPLATE_MISSING"
E_TEMPLATE_MANIFEST_INVALID = "E_TEMPLATE_MANIFEST_INVALID"
E_DRIVER_UNKNOWN = "E_DRIVER_UNKNOWN"
E_INPUT_UNSATISFIED = "E_INPUT_UNSATISFIED"
E_CAPABILITY_MISSING = "E_CAPABILITY_MISSING"


def validate_bit_document_capabilities(
    project: Project,
    *,
    package_dir: Path | None = None,
    registry: DriverRegistry | None = None,
) -> list[Diagnostic]:
    """Ensure document bits only emit operations supported by target drivers.

    Args:
        project: Project whose bits may emit document operations.
        package_dir: Unused; reserved for future template-aware checks.
        registry: Optional driver registry; defaults to installed drivers.

    Returns:
        Diagnostics when a bit requires capabilities the driver lacks.
    """
    del package_dir
    if not project.documents:
        return []

    registry = registry or default_driver_registry()
    documents_by_id = {item.id: item for item in project.documents}
    diagnostics: list[Diagnostic] = []

    for index, bit in enumerate(project.bits):
        required_caps = emitted_ops_for_bit(bit)
        if not required_caps:
            continue

        document_id = bit.config.get("documentId")
        if not isinstance(document_id, str):
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_CAPABILITY_MISSING,
                    f"Bit {bit.id} missing documentId in config",
                    f"/bits/{index}/config",
                )
            )
            continue

        definition = documents_by_id.get(document_id)
        if definition is None:
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_CAPABILITY_MISSING,
                    f"Bit {bit.id} targets unknown document {document_id}",
                    f"/bits/{index}/config/documentId",
                )
            )
            continue

        try:
            driver = registry.get(definition.driver)
        except KeyError:
            continue

        driver_caps = set(driver.manifest.capabilities)
        for capability in required_caps:
            if capability not in driver_caps:
                diagnostics.append(
                    Diagnostic(
                        "error",
                        E_CAPABILITY_MISSING,
                        (
                            f"Driver {definition.driver} lacks {capability} "
                            f"required by bit {bit.id}"
                        ),
                        f"/bits/{index}",
                    )
                )

    return diagnostics


def default_driver_registry() -> DriverRegistry:
    """Load installed document drivers, falling back to in-process imports.

    Returns:
        Registry populated with available document drivers.
    """
    registry = load_entry_point_drivers()
    if registry.list_ids():
        return registry

    # Editable installs may not expose entry points yet; import directly.
    from roborean_documents_docx.driver import create_driver as docx
    from roborean_documents_dxf.driver import create_driver as dxf
    from roborean_documents_image.driver import create_driver as image
    from roborean_documents_markdown.driver import create_driver as markdown
    from roborean_documents_text.driver import create_driver as text
    from roborean_documents_xlsx.driver import create_driver as xlsx

    for factory in (text, markdown, xlsx, docx, image, dxf):
        registry.register(factory())
    return registry


def compile_documents(
    project: Project,
    *,
    package_dir: Path | None = None,
    registry: DriverRegistry | None = None,
) -> list[Diagnostic]:
    """Validate document definitions, manifests, and driver availability.

    Args:
        project: Project containing document definitions.
        package_dir: Optional package root used to load template manifests.
        registry: Optional driver registry; defaults to installed drivers.

    Returns:
        Diagnostics for missing templates, drivers, or inputs.
    """
    if not project.documents:
        return []

    registry = registry or default_driver_registry()
    diagnostics: list[Diagnostic] = []
    template_ids = {item["id"] for item in project.templates}
    variables = {variable.key for variable in project.variables}
    store = None
    if package_dir is not None:
        store = DocumentTemplateStore(package_dir, project)

    for index, definition in enumerate(project.documents):
        path = f"/documents/{index}"

        # Require template table entries referenced by documents.
        if definition.template_ref not in template_ids:
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_TEMPLATE_MISSING,
                    f"Unknown templateRef: {definition.template_ref}",
                    path,
                )
            )

        # Require an installed driver for each document definition.
        try:
            registry.get(definition.driver)
        except KeyError:
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_DRIVER_UNKNOWN,
                    f"Unknown document driver: {definition.driver}",
                    path,
                )
            )

        if store is not None and definition.template_ref in template_ids:
            try:
                manifest = store.load_manifest(
                    definition.template_ref,
                    manifest_ref=definition.template_manifest_ref,
                )
                for required in manifest.required_inputs:
                    if required not in variables:
                        diagnostics.append(
                            Diagnostic(
                                "error",
                                E_INPUT_UNSATISFIED,
                                (
                                    "Template requires missing variable: "
                                    f"{required}"
                                ),
                                path,
                            )
                        )
            except (TemplateError, ValueError, KeyError, OSError) as error:
                logger.debug(
                    "Template manifest invalid for %s",
                    definition.template_ref,
                    exc_info=True,
                )
                diagnostics.append(
                    Diagnostic(
                        "error",
                        E_TEMPLATE_MANIFEST_INVALID,
                        str(error),
                        path,
                    )
                )

        if definition.output_target is None:
            diagnostics.append(
                Diagnostic(
                    "warning",
                    E_CONFIG,
                    "Document has no outputTarget; a default will be used",
                    path,
                )
            )

    return diagnostics
