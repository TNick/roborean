"""End-to-end tests for the deterministic Phase 1 runner."""

from roborean_engine import compile_project, load_project_path, run_project


class TestRunProject:
    """Verify compiled projects execute through audited patches."""

    def test_set_and_copy(self, conformance_dir) -> None:
        """Apply both built-in workspace bits in declared order."""
        project = load_project_path(
            conformance_dir / "projects" / "02_set_and_copy.json"
        )

        result = run_project(compile_project(project), project)

        assert result.status == "success"
        assert [item.status for item in result.bit_results] == [
            "success",
            "success",
        ]
        assert result.bit_results[1].workspace_patch.ops[0].key == "title_copy"

    def test_const_write_fails(self, conformance_dir) -> None:
        """Audit, rather than apply, an attempted const mutation."""
        project = load_project_path(
            conformance_dir / "projects" / "06_const_rejection.json"
        )

        result = run_project(compile_project(project), project)

        assert result.status == "failed"
        assert result.bit_results[0].workspace_patch.ops[0].op == "reject"
