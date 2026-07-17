"""Sequential runner for compiled Phase 1 projects."""

import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from roborean_spec import BitResult, Project, RunResults, WorkspacePatch

from .bits.base import BitContext
from .bits.registry import BitTypeRegistry, builtin_registry
from .diagnostics import E_CONST_WRITE, E_RULE_EVAL, E_UNDECLARED_WRITE, Diagnostic
from .patch_apply import apply_patch
from .rules.evaluator import RuleEvalError, evaluate_rule
from .rules.profile import RULE_PROFILE_VERSION
from .version import ENGINE_VERSION
from .workspace import initial_snapshot, workspace_hash


@dataclass(frozen=True)
class RunOptions:
    """Controls an individual project run."""

    run_id: str | None = None
    dry_run: bool = False
    stop_on_bit_error: bool = True


def run_project(
    compiled,
    project: Project,
    *,
    registry: BitTypeRegistry | None = None,
    options: RunOptions | None = None,
) -> RunResults:
    """Run compiled bits in source order against a copy-on-write workspace."""
    options = options or RunOptions()
    registry = registry or builtin_registry()
    started = datetime.now(UTC)
    snapshot = initial_snapshot(project)
    input_hash = workspace_hash(snapshot)
    const_keys = {variable.key for variable in project.variables if variable.const}
    bit_results: list[BitResult] = []
    status = "success"

    # Execute ordered bits, stopping only when the configured error policy asks.
    for bit in project.bits:
        began = time.perf_counter()
        patch = WorkspacePatch(ops=[])
        diagnostics: list[Diagnostic] = []
        active = True
        reason: bool | str = "always"
        try:
            rule = compiled.activation_expressions[bit.id]
            if bit.when is not True:
                reason = evaluate_rule(rule, snapshot)
                active = bool(reason)
            if not active:
                bit_results.append(
                    BitResult(
                        bitId=bit.id,
                        type=bit.type,
                        active=False,
                        activationReason=False,
                        status="inactive",
                        durationMs=(time.perf_counter() - began) * 1000,
                        workspacePatch=patch,
                        documentOps=[],
                        diagnostics=[],
                        pluginVersion=compiled.plugin_versions[bit.type],
                    )
                )
                continue
            _, handler = registry.get(bit.type)
            output = handler.execute(BitContext(bit, snapshot, compiled))
            snapshot, patch = apply_patch(
                snapshot,
                output.patch,
                allowed_writes=set(bit.writes),
                const_keys=const_keys,
                bit_id=bit.id,
            )
            diagnostics.extend(output.diagnostics)
            for operation in patch.ops:
                if operation.op == "reject":
                    code = (
                        E_CONST_WRITE
                        if operation.reason == "const variable"
                        else E_UNDECLARED_WRITE
                    )
                    diagnostics.append(
                        Diagnostic("error", code, operation.reason)
                    )
            result_status = "failed" if diagnostics else "success"
        except RuleEvalError as error:
            diagnostics.append(Diagnostic("error", E_RULE_EVAL, str(error)))
            result_status = "failed"
        except KeyError as error:
            diagnostics.append(
                Diagnostic("error", E_UNDECLARED_WRITE, f"Missing bit value: {error}")
            )
            result_status = "failed"

        bit_results.append(
            BitResult(
                bitId=bit.id,
                type=bit.type,
                active=active,
                activationReason=reason,
                status=result_status,
                durationMs=(time.perf_counter() - began) * 1000,
                workspacePatch=patch,
                documentOps=[],
                diagnostics=[item.to_dict() for item in diagnostics],
                pluginVersion=compiled.plugin_versions.get(bit.type, ""),
            )
        )
        if result_status == "failed":
            status = "failed"
            if options.stop_on_bit_error or bit.on_error.value == "abort":
                break

    # Record time-dependent fields only at the run boundary.
    finished = datetime.now(UTC)
    return RunResults(
        runId=options.run_id or str(uuid.uuid4()),
        projectId=project.id,
        projectDigest=compiled.digest,
        startedAt=started.isoformat(),
        finishedAt=finished.isoformat(),
        status=status,
        inputWorkspaceHash=input_hash,
        finalWorkspaceHash=workspace_hash(snapshot),
        bitResults=bit_results,
        artifacts=[],
        engineVersion=ENGINE_VERSION,
        ruleProfileVersion=RULE_PROFILE_VERSION,
    )
