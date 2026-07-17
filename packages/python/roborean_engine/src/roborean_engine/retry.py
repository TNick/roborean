"""Effect-class aware retry policy."""

from dataclasses import dataclass
from typing import Literal

from roborean_spec import CompiledProject, EffectClass, Project


@dataclass(frozen=True)
class RetryDecision:
    """Whether a retry may proceed and how."""

    allowed: bool
    reason: str
    mode: Literal["replay_pure", "rerun_with_current", "forbidden"]


EFFECT_RETRY_DEFAULTS: dict[EffectClass, RetryDecision] = {
    EffectClass.PURE: RetryDecision(True, "pure", "replay_pure"),
    EffectClass.WORKSPACE: RetryDecision(
        True, "workspace_patch", "rerun_with_current"
    ),
    EffectClass.DOCUMENT: RetryDecision(
        True, "document_regen", "rerun_with_current"
    ),
    EffectClass.FILESYSTEM: RetryDecision(
        False, "filesystem_side_effect", "forbidden"
    ),
    EffectClass.NETWORK: RetryDecision(
        False, "network_side_effect", "forbidden"
    ),
    EffectClass.EXTERNAL_PROCESS: RetryDecision(False, "process", "forbidden"),
    EffectClass.TRANSACTIONAL_EXTERNAL: RetryDecision(
        False, "external_tx", "forbidden"
    ),
}


def decide_retry(
    project: Project,
    compiled: CompiledProject,
    *,
    force: bool = False,
) -> RetryDecision:
    """Decide whether the project's active effect classes allow retry."""
    # Consider every bit's declared effect class; inactive bits still pin
    # the project risk profile for retries.
    decisions = []
    for bit in project.bits:
        decision = EFFECT_RETRY_DEFAULTS[bit.effect_class]
        decisions.append(decision)
        if not decision.allowed and not force:
            return decision
    if force and any(not item.allowed for item in decisions):
        return RetryDecision(True, "forced", "rerun_with_current")
    if all(item.mode == "replay_pure" for item in decisions):
        return RetryDecision(True, "pure", "replay_pure")
    return RetryDecision(True, "workspace_or_document", "rerun_with_current")


def retry_policy_snapshot(project: Project) -> dict[str, str]:
    """Capture per-bit effect classes for the run record."""
    return {bit.id: bit.effect_class.value for bit in project.bits}
