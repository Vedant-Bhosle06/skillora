"""State-space A* search over sets of skills to learn (spec section 4.3)."""
from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from itertools import count
from typing import Iterable

from graph_loader import GraphStore


class UnknownSkillError(ValueError):
    """A requirement references a skill id that is not in the graph."""


@dataclass
class Requirement:
    any_of: list[str]
    min_rank: int
    label: str = ""


@dataclass
class Problem:
    """Everything derived from (held skills, requirements) before searching."""

    held: dict[str, int]
    unmet: list[Requirement]
    target: dict[str, int]                 # t(s) for every s in R
    cost: dict[str, float]                 # step cost for every s in R
    relevant: set[str]                     # R
    ancestors: dict[str, set[str]]         # for o in R: R-members that lead to o
    singles: list[str] = field(default_factory=list)  # skills of single-option unmet reqs


@dataclass
class SearchResult:
    goals: list[frozenset[str]]
    states_expanded: int
    capped: bool
    initial_h: float = 0.0


def prepare(store: GraphStore, held_skills: dict[str, int], requirements: Iterable[Requirement]) -> Problem:
    """Apply the held-skill rule, then derive R, t(s) and step costs."""
    reqs = list(requirements)
    for r in reqs:
        for o in r.any_of:
            if o not in store.graph:
                raise UnknownSkillError(f"Unknown skill id: {o}")
    held = {s: r for s, r in held_skills.items() if s in store.graph and r > 0}
    unmet = [r for r in reqs if not any(held.get(o, 0) >= r.min_rank for o in r.any_of)]

    target: dict[str, int] = {}
    for r in unmet:
        for o in r.any_of:
            target[o] = max(target.get(o, 0), r.min_rank)

    # R: options of unmet requirements plus their unknown prerequisite ancestors.
    # Known skills are never entered, and upgrades (already known) need no prerequisites.
    relevant = set(target)
    stack = [o for o in target if held.get(o, 0) < 1]
    while stack:
        s = stack.pop()
        for p in store.graph.predecessors(s):
            if held.get(p, 0) >= 1 or p in relevant:
                continue
            relevant.add(p)
            target[p] = 1
            stack.append(p)

    cost = {s: store.est_hours[s] * (target[s] - held.get(s, 0)) / 2 for s in relevant}

    ancestors: dict[str, set[str]] = {}
    for o in relevant:
        seen: set[str] = set()
        stack = [o] if held.get(o, 0) < 1 else []
        while stack:
            s = stack.pop()
            for p in store.graph.predecessors(s):
                if p in relevant and p not in seen:
                    seen.add(p)
                    stack.append(p)
        ancestors[o] = seen

    singles = sorted({r.any_of[0] for r in unmet if len(set(r.any_of)) == 1})
    return Problem(held, unmet, target, cost, relevant, ancestors, singles)


def _unlocked(s: str, learned: frozenset[str], p: Problem, store: GraphStore) -> bool:
    if p.held.get(s, 0) >= 1:
        return True  # upgrade
    have = lambda x: p.held.get(x, 0) >= 1 or x in learned  # noqa: E731
    if not all(have(x) for x in store.mandatory[s]):
        return False
    return all(any(have(x) for x in members) for members in store.groups[s].values())


def astar_search(store: GraphStore, p: Problem, k: int, max_states: int,
                 prune: bool = True) -> SearchResult:
    """Collect up to 3k minimal goal sets in non-decreasing cost order."""
    cost = p.cost
    unmet_opts = [set(r.any_of) for r in p.unmet]

    def h(learned: frozenset[str]) -> float:
        return sum(cost[s] for s in p.singles if s not in learned)

    def is_goal(learned: frozenset[str]) -> bool:
        return all(opts & learned for opts in unmet_opts)

    def moves(learned: frozenset[str]) -> list[str]:
        if prune:
            cand: set[str] = set()
            for opts in unmet_opts:
                if opts & learned:
                    continue
                for o in opts:
                    cand.add(o)
                    cand |= p.ancestors[o]
        else:
            cand = set(p.relevant)
        return sorted(s for s in cand - learned if _unlocked(s, learned, p, store))

    start: frozenset[str] = frozenset()
    initial_h = h(start)
    tie = count()
    heap = [(initial_h, 0.0, next(tie), start)]
    seen = {start}
    goals: list[frozenset[str]] = []
    expanded = 0
    capped = False

    while heap and len(goals) < 3 * k:
        _, neg_g, _, learned = heapq.heappop(heap)
        if is_goal(learned):
            if not any(g < learned for g in goals):
                goals.append(learned)
            continue
        if expanded >= max_states:
            capped = True
            break
        expanded += 1
        g = -neg_g
        for s in moves(learned):
            nxt = learned | {s}
            if nxt in seen:
                continue
            seen.add(nxt)
            g2 = g + cost[s]
            heapq.heappush(heap, (g2 + h(nxt), -g2, next(tie), nxt))
    return SearchResult(goals, expanded, capped, initial_h)
