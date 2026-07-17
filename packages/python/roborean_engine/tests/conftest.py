"""Shared fixtures for Roborean engine tests."""

from pathlib import Path

import pytest


@pytest.fixture(scope="session")
def repo_root() -> Path:
    """Return the repository root."""
    return Path(__file__).resolve().parents[4]


@pytest.fixture(scope="session")
def conformance_dir(repo_root: Path) -> Path:
    """Return the shared conformance corpus."""
    return repo_root / "conformance"
