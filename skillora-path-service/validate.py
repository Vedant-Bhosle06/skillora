"""Check that a learning order respects prerequisites (FR-6)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Sequence

from graph_loader import GraphStore


@dataclass
class Violation:
    skill_id: str
    position: int                                   # 1-based step number
    missing: list[str] = field(default_factory=list)          # unmet mandatory prerequisites
    unsatisfied_groups: list[str] = field(default_factory=list)  # OR-groups with no member known

    def to_dict(self) -> dict:
        return {"skillId": self.skill_id, "order": self.position,
                "missing": self.missing, "unsatisfiedGroups": self.unsatisfied_groups}


def validate_order(step_ids: Sequence[str], held: dict[str, int], store: GraphStore) -> list[Violation]:
    """For each step, every mandatory prerequisite and one member of each group
    must be held (rank >= 1) or appear at an earlier step. Steps that upgrade an
    already-held skill are always allowed. Raises KeyError for unknown ids."""
    known = {s for s, r in held.items() if r >= 1}
    violations: list[Violation] = []
    for i, sid in enumerate(step_ids, start=1):
        if sid not in store.graph:
            raise KeyError(sid)
        if sid not in known:
            missing = sorted(x for x in store.mandatory[sid] if x not in known)
            bad_groups = sorted(g for g, members in store.groups[sid].items() if not members & known)
            if missing or bad_groups:
                violations.append(Violation(sid, i, missing, bad_groups))
        known.add(sid)
    return violations
