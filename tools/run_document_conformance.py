"""Run Phase 3 document conformance packages."""

from __future__ import annotations

from pathlib import Path

from roborean_documents_docx.driver import docx_paragraph_texts
from roborean_documents_xlsx.driver import xlsx_semantic_equal
from roborean_engine import compile_project
from roborean_engine.compiler import CompileOptions
from roborean_engine.runner import RunOptions, run_project_detailed
from roborean_storage_dict import load_project_dir

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = ROOT / "conformance" / "documents"


def _run_one(package_dir: Path) -> list[str]:
    """Execute one document package and check basic invariants."""
    failures: list[str] = []
    project = load_project_dir(package_dir)
    try:
        compiled = compile_project(
            project, options=CompileOptions(package_dir=package_dir)
        )
    except Exception as error:
        return [f"{package_dir.name}: compile failed: {error}"]
    outcome = run_project_detailed(
        compiled,
        project,
        options=RunOptions(package_dir=package_dir),
    )
    if outcome.results.status != "success":
        failures.append(
            f"{package_dir.name}: run status {outcome.results.status}"
        )
    if not outcome.results.artifacts:
        failures.append(f"{package_dir.name}: no artifacts")
    if not outcome.artifact_payloads:
        failures.append(f"{package_dir.name}: empty payloads")

    # Format-specific checks for known cases.
    name = package_dir.name
    if name == "D01_text_hello":
        body = next(iter(outcome.artifact_payloads.values())).decode("utf-8")
        if body != "Hello, Ada!\n":
            failures.append(f"{name}: unexpected text {body!r}")
    if name == "D02_markdown_report":
        body = next(iter(outcome.artifact_payloads.values())).decode("utf-8")
        if "## Summary" not in body or "| A | 1 |" not in body:
            failures.append(f"{name}: unexpected markdown\n{body}")
    if name == "D03_xlsx_estimate":
        payload = next(iter(outcome.artifact_payloads.values()))
        # Round-trip semantic equality against itself.
        if not xlsx_semantic_equal(payload, payload):
            failures.append(f"{name}: xlsx semantic self-compare failed")
        preview = outcome.previews.get("estimate", {})
        if preview.get("mode") != "html":
            failures.append(f"{name}: missing html preview")
    if name == "D04_docx_letter":
        payload = next(iter(outcome.artifact_payloads.values()))
        texts = docx_paragraph_texts(payload)
        if "Dear Ada," not in texts:
            failures.append(f"{name}: missing rendered greeting: {texts}")
        if "Best regards." not in texts:
            failures.append(f"{name}: missing appended paragraph: {texts}")
    if name == "D05_image_stamp":
        preview = outcome.previews.get("stamp", {})
        texts = preview.get("body", {}).get("texts", [])
        if not any(item.get("text") == "DRAFT" for item in texts):
            failures.append(f"{name}: DRAFT text missing from preview")
    if name == "D06_dxf_frame":
        preview = outcome.previews.get("frame", {})
        entities = preview.get("body", {}).get("entities", [])
        kinds = {item.get("type") for item in entities}
        if "polyline" not in kinds or "text" not in kinds:
            failures.append(f"{name}: unexpected entities {entities}")
    return failures


def main() -> int:
    """Run all document conformance packages."""
    if not DOCUMENTS.is_dir():
        print("No conformance/documents directory")
        return 1
    failures: list[str] = []
    for package in sorted(DOCUMENTS.iterdir()):
        if package.is_dir() and (package / "project.json").is_file():
            failures.extend(_run_one(package))
    if failures:
        print("\n".join(failures))
        return 1
    print("Document conformance passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
