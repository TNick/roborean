"""Run Phase 3 document conformance against golden expected artifacts."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from compare_artifacts import artifact_compare_mode, compare_artifact_bytes
from roborean_engine import compile_project
from roborean_engine.compiler import CompileError, CompileOptions
from roborean_engine.runner import RunOptions, run_project_detailed
from roborean_storage_dict import load_project_dir

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = ROOT / "conformance" / "documents"
EXPECTED = ROOT / "conformance" / "expected" / "documents"
COMPARE_BYTES_FALLBACK = "bytes"
PREVIEW_VOLATILE = {"generatedAt"}


def _aggregate_document_ops(outcome: Any) -> dict[str, list[dict[str, Any]]]:
    """Collect document operations emitted during a run, keyed by document id.

    Args:
        outcome: Detailed run outcome from ``run_project_detailed``.

    Returns:
        Document id to ordered list of operation payloads.
    """
    grouped: dict[str, list[dict[str, Any]]] = {}
    for bit in outcome.results.bit_results:
        for op in bit.document_ops:
            if not isinstance(op, dict):
                continue
            document_id = str(op.get("documentId", ""))
            grouped.setdefault(document_id, []).append(op)
    return grouped


def _template_text(
    package_dir: Path, project: Any, document: Any
) -> str | None:
    """Load UTF-8 template text for text or markdown documents.

    Args:
        package_dir: Conformance package directory.
        project: Parsed project model.
        document: Document definition on the project.

    Returns:
        Template file contents when the template is plain text.
    """
    template_ref = document.template_ref
    for entry in project.templates:
        if entry.get("id") != template_ref:
            continue
        path = package_dir / str(entry.get("path", ""))
        if document.type in {"text", "markdown"} and path.is_file():
            return path.read_text(encoding="utf-8")
    return None


def _paragraph_texts_from_docx_html(html: str) -> list[str]:
    """Extract paragraph strings from a docx HTML preview body.

    Args:
        html: HTML preview ``body`` string.

    Returns:
        Text content of each ``p`` or heading tag in document order.
    """
    import re

    texts: list[str] = []
    for match in re.finditer(r"<(p|h[1-6])>(.*?)</\1>", html, flags=re.DOTALL):
        texts.append(match.group(2))
    return texts


def _sheet_rows_from_xlsx_html(html: str) -> dict[str, list[list[str]]]:
    """Parse simplified xlsx preview HTML into sheet row matrices.

    Args:
        html: HTML preview ``body`` string.

    Returns:
        Sheet title to table rows extracted from ``h3``/``table`` pairs.
    """
    import re

    sheets: dict[str, list[list[str]]] = {}
    for block in re.findall(
        r"<h3>(.*?)</h3><table>(.*?)</table>", html, flags=re.DOTALL
    ):
        title = block[0]
        rows: list[list[str]] = []
        for row_html in re.findall(
            r"<tr>(.*?)</tr>", block[1], flags=re.DOTALL
        ):
            cells = re.findall(r"<td>(.*?)</td>", row_html, flags=re.DOTALL)
            rows.append([cell if cell else "" for cell in cells])
        sheets[title] = rows
    return sheets


def _preview_fixtures_payload(
    package_dir: Path, project: Any, outcome: Any
) -> dict[str, Any]:
    """Build TypeScript preview fixture inputs from a successful run.

    Args:
        package_dir: Conformance package directory.
        project: Parsed project model.
        outcome: Detailed run outcome.

    Returns:
        JSON payload for ``expected.preview-fixtures.json``.
    """
    ops_by_doc = _aggregate_document_ops(outcome)
    documents: dict[str, Any] = {}
    for document in project.documents:
        doc_id = document.id
        preview = outcome.previews.get(doc_id, {})
        body = preview.get("body")
        entry: dict[str, Any] = {
            "definition": {
                "id": doc_id,
                "type": document.type,
                "driver": document.driver,
            },
            "ops": ops_by_doc.get(doc_id, []),
        }
        template_text = _template_text(package_dir, project, document)
        if template_text is not None:
            entry["templateText"] = template_text
        if document.type == "docx" and isinstance(body, str):
            entry["paragraphTexts"] = _paragraph_texts_from_docx_html(body)
        if document.type == "xlsx" and isinstance(body, str):
            entry["sheetRows"] = _sheet_rows_from_xlsx_html(body)
        if document.type == "image" and isinstance(body, dict):
            entry["imageSize"] = body.get("size")
        documents[doc_id] = entry
    return {"documents": documents}


def _write_preview_fixtures(
    package_dir: Path, project: Any, outcome: Any
) -> None:
    """Write preview fixture inputs for the TypeScript conformance runner.

    Args:
        package_dir: Conformance package directory.
        project: Parsed project model.
        outcome: Successful detailed run outcome.
    """
    _write_json(
        _expected_dir(package_dir.name) / "expected.preview-fixtures.json",
        _preview_fixtures_payload(package_dir, project, outcome),
    )


def _normalize_previews(previews: dict[str, Any]) -> dict[str, Any]:
    """Drop volatile preview fields before golden compare or write.

    Args:
        previews: Document-id keyed preview map from a run outcome.

    Returns:
        Preview map with volatile keys removed recursively.
    """

    def _normalize(value: Any) -> Any:
        if isinstance(value, dict):
            return {
                key: _normalize(item)
                for key, item in value.items()
                if key not in PREVIEW_VOLATILE
            }
        if isinstance(value, list):
            return [_normalize(item) for item in value]
        return value

    return _normalize(previews)


def _write_json(path: Path, data: Any) -> None:
    """Write pretty JSON with a trailing newline.

    Args:
        path: Destination file.
        data: JSON-serializable payload.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def _expected_dir(package_name: str) -> Path:
    """Return the golden directory for one document package.

    Args:
        package_name: Folder name under ``conformance/documents``.

    Returns:
        Matching path under ``conformance/expected/documents``.
    """
    return EXPECTED / package_name


def _artifact_meta_entries(outcome: Any) -> list[dict[str, Any]]:
    """Build stable artifact manifest entries from a run outcome.

    Args:
        outcome: Detailed run outcome with artifact metadata.

    Returns:
        Manifest rows without volatile digests or byte lengths.
    """
    entries: list[dict[str, Any]] = []
    for item in outcome.results.artifacts:
        if not isinstance(item, dict):
            continue
        document_id = str(item.get("documentId", ""))
        path = str(item.get("path", document_id))
        media_type = str(item.get("mediaType", "application/octet-stream"))
        entries.append(
            {
                "documentId": document_id,
                "path": path,
                "mediaType": media_type,
                "compare": artifact_compare_mode(media_type, path),
            }
        )
    entries.sort(key=lambda row: row["documentId"])
    return entries


def _write_success_goldens(
    package_dir: Path, project: Any, outcome: Any
) -> None:
    """Write artifact and preview goldens for a successful document package.

    Args:
        package_dir: Source package under ``conformance/documents``.
        project: Parsed project model for the package.
        outcome: Successful detailed run outcome.
    """
    expected_dir = _expected_dir(package_dir.name)
    artifacts_dir = expected_dir / "artifacts"
    entries = _artifact_meta_entries(outcome)

    # Persist comparable payloads under artifacts/<outputTarget>; skip
    # non-deterministic formats (DXF timestamps/GUIDs).
    for entry in entries:
        if entry["compare"] == "skip":
            continue
        document_id = entry["documentId"]
        path = entry["path"]
        payload = outcome.artifact_payloads.get(document_id)
        if payload is None:
            continue
        target = artifacts_dir / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)

    _write_json(
        expected_dir / "expected.artifacts.json",
        {"artifacts": entries},
    )
    _write_json(
        expected_dir / "expected.previews.json",
        _normalize_previews(outcome.previews),
    )
    _write_preview_fixtures(package_dir, project, outcome)


def _compare_success_goldens(package_dir: Path, outcome: Any) -> list[str]:
    """Compare a run outcome to on-disk document goldens.

    Args:
        package_dir: Source package under ``conformance/documents``.
        outcome: Detailed run outcome to validate.

    Returns:
        Human-readable failure messages (empty when the fixture matches).
    """
    failures: list[str] = []
    name = package_dir.name
    expected_dir = _expected_dir(name)
    manifest_path = expected_dir / "expected.artifacts.json"
    previews_path = expected_dir / "expected.previews.json"
    fixtures_path = expected_dir / "expected.preview-fixtures.json"

    if not manifest_path.is_file():
        return [f"{name}: missing expected.artifacts.json"]
    if not previews_path.is_file():
        return [f"{name}: missing expected.previews.json"]
    if not fixtures_path.is_file():
        return [f"{name}: missing expected.preview-fixtures.json"]

    if outcome.results.status != "success":
        failures.append(f"{name}: run status {outcome.results.status}")
    if not outcome.artifact_payloads:
        failures.append(f"{name}: empty payloads")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected_entries = manifest.get("artifacts", [])
    actual_entries = _artifact_meta_entries(outcome)

    # Compare stable artifact metadata (ids, paths, media types, modes).
    if actual_entries != expected_entries:
        failures.append(f"{name}: expected.artifacts.json mismatch")

    for entry in expected_entries:
        document_id = entry["documentId"]
        path = entry["path"]
        media_type = entry["mediaType"]
        compare = entry.get("compare", COMPARE_BYTES_FALLBACK)
        golden = expected_dir / "artifacts" / path
        actual = outcome.artifact_payloads.get(document_id)
        if actual is None:
            failures.append(f"{name}: missing payload for {document_id}")
            continue
        if compare == "skip":
            continue
        if not golden.is_file():
            failures.append(f"{name}: missing golden artifact {path}")
            continue
        try:
            compare_artifact_bytes(
                media_type,
                golden.read_bytes(),
                actual,
                path=path,
            )
        except AssertionError as error:
            failures.append(f"{name}: {path}: {error}")

    expected_previews = json.loads(previews_path.read_text(encoding="utf-8"))
    if _normalize_previews(outcome.previews) != expected_previews:
        failures.append(f"{name}: expected.previews.json mismatch")

    return failures


def _run_one(package_dir: Path, *, write: bool) -> list[str]:
    """Execute one document package against its golden expected tree.

    Args:
        package_dir: Package directory under ``conformance/documents``.
        write: When ``True``, rewrite golden files instead of comparing.

    Returns:
        Failure messages for this package (empty on success).
    """
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

    if write:
        _write_success_goldens(package_dir, project, outcome)
        return []

    return _compare_success_goldens(package_dir, outcome)


def _run_d99_capability_fail(*, write: bool) -> list[str]:
    """Check D99 compile failure against expected.compile-error.json.

    Args:
        write: When ``True``, write the expected compile-error golden.

    Returns:
        Failure messages (empty on success).
    """
    package = DOCUMENTS / "D99_capability_fail"
    if not package.is_dir():
        return []

    expected_path = _expected_dir(package.name) / "expected.compile-error.json"
    project = load_project_dir(package)

    try:
        compile_project(project, options=CompileOptions(package_dir=package))
    except CompileError as error:
        codes = sorted({item.code for item in error.diagnostics})
        payload = {"codes": codes}
        if write:
            _write_json(expected_path, payload)
            return []
        if not expected_path.is_file():
            return [f"{package.name}: missing expected.compile-error.json"]
        expected = json.loads(expected_path.read_text(encoding="utf-8"))
        if expected != payload:
            return [
                f"{package.name}: compile-error mismatch "
                f"(expected {expected}, got {payload})"
            ]
        return []
    except Exception as error:
        return [f"{package.name}: unexpected error: {error}"]

    return [f"{package.name}: expected compile failure"]


def main() -> int:
    """Run all document conformance packages against golden fixtures."""
    write = "--write" in sys.argv
    if not DOCUMENTS.is_dir():
        print("No conformance/documents directory")
        return 1

    if write:
        EXPECTED.mkdir(parents=True, exist_ok=True)

    failures: list[str] = []
    failures.extend(_run_d99_capability_fail(write=write))
    for package in sorted(DOCUMENTS.iterdir()):
        if not package.is_dir():
            continue
        if package.name.startswith("D99_"):
            continue
        if (package / "project.json").is_file():
            failures.extend(_run_one(package, write=write))

    if failures:
        print("\n".join(failures))
        return 1
    if write:
        print(f"Wrote document goldens under {EXPECTED}")
    else:
        print("Document conformance passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
