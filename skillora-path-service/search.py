"""State-space A* search over sets of skills to learn (docs/ALGORITHM.md)."""
from __future__ import annotations

import heapq
import time
from dataclasses import dataclass, field
from itertools import count
from typing import Iterable

import networkx as nx

from graph_loader import GraphStore
from validate import validate_order


class UnknownSkillError(ValueError):
    """A requirement references a skill id that is not in the graph."""


_EPS = 1e-9
HEURISTICS = ("closure", "simple")


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
    must: frozenset[str] = frozenset()     # N: skills every solution must learn (closure heuristic)


@dataclass
class SearchResult:
    goals: list[frozenset[str]]
    states_expanded: int
    capped: bool
    initial_h: float = 0.0
    states_to_primary: int | None = None   # states expanded when the first goal was popped


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
    # N: closure of the single-option requirements' skills under mandatory prerequisite
    # edges, stopping at known skills (same boundary as R). Group edges are excluded.
    must: set[str] = set(singles)
    stack = [o for o in singles if held.get(o, 0) < 1]
    while stack:
        s = stack.pop()
        for x in store.mandatory[s]:
            if held.get(x, 0) >= 1 or x in must:
                continue
            must.add(x)
            stack.append(x)
    return Problem(held, unmet, target, cost, relevant, ancestors, singles, frozenset(must))


def _unlocked(s: str, learned: frozenset[str], p: Problem, store: GraphStore) -> bool:
    if p.held.get(s, 0) >= 1:
        return True  # upgrade
    have = lambda x: p.held.get(x, 0) >= 1 or x in learned  # noqa: E731
    if not all(have(x) for x in store.mandatory[s]):
        return False
    return all(any(have(x) for x in members) for members in store.groups[s].values())


def astar_search(store: GraphStore, p: Problem, k: int, max_states: int,
                 prune: bool = True, use_heuristic: bool = True,
                 cost_bound_ratio: float = 1.5, heuristic: str = "closure") -> SearchResult:
    """Collect up to 3k minimal goal sets in non-decreasing cost order, all with
    cost <= cost_bound_ratio x (cheapest goal cost).

    With use_heuristic=False this is Dijkstra: the same code with h == 0.
    heuristic: "closure" (default; sum of cost over N minus learned, N = mandatory
    closure of single-option requirements) or "simple" (single-option skills only).
    Both are admissible and consistent.
    """
    if heuristic not in HEURISTICS:
        raise ValueError(f"Unknown heuristic: {heuristic}")
    cost = p.cost
    h_set = p.must if heuristic == "closure" else frozenset(p.singles)
    unmet_opts = [set(r.any_of) for r in p.unmet]

    def h(learned: frozenset[str]) -> float:
        if not use_heuristic:
            return 0.0
        return sum(cost[s] for s in h_set if s not in learned)

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
    states_to_primary: int | None = None
    bound = float("inf")       # set once the cheapest goal cost C* is known

    while heap and len(goals) < 3 * k:
        f, neg_g, _, learned = heapq.heappop(heap)
        if f > bound:
            break              # h is admissible and consistent: nothing cheaper-than-bound remains
        if is_goal(learned):
            if states_to_primary is None:
                states_to_primary = expanded
                bound = f * cost_bound_ratio + _EPS * max(1.0, f)
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
            f2 = g2 + h(nxt)
            if f2 > bound:
                continue
            heapq.heappush(heap, (f2, -g2, next(tie), nxt))
    return SearchResult(goals, expanded, capped, initial_h, states_to_primary)


def closure(store: GraphStore, p: Problem, option: str,
            memo: dict[str, frozenset[str]] | None = None) -> frozenset[str]:
    """Skills to learn for `option`: itself plus unknown mandatory ancestors,
    taking the cheapest member (by its own closure cost) of each unsatisfied group."""
    memo = {} if memo is None else memo
    if option in memo:
        return memo[option]
    result = {option}
    if p.held.get(option, 0) < 1:
        for x in store.mandatory[option]:
            if p.held.get(x, 0) < 1:
                result |= closure(store, p, x, memo)
        for members in store.groups[option].values():
            if any(p.held.get(x, 0) >= 1 for x in members):
                continue
            best = min((closure(store, p, x, memo) for x in members if x in p.relevant),
                       key=lambda c: (sum(p.cost[s] for s in c), sorted(c)))
            result |= best
    memo[option] = frozenset(result)
    return memo[option]


def greedy_fallback(store: GraphStore, p: Problem) -> frozenset[str]:
    """Cheapest-closure option per unmet requirement; used when the state cap hits with no goal."""
    memo: dict[str, frozenset[str]] = {}
    chosen: set[str] = set()
    for r in p.unmet:
        if set(r.any_of) & chosen:
            continue
        best = min((closure(store, p, o, memo) for o in dict.fromkeys(r.any_of)),
                   key=lambda c: (sum(p.cost[s] for s in c), sorted(c)))
        chosen |= best
    return frozenset(chosen)


# ---------------------------------------------------------------------------
# Ranking, ordering, rationale
# ---------------------------------------------------------------------------

RANK_NAMES = {0: "none", 1: "beginner", 2: "intermediate", 3: "advanced"}


class PathValidationError(RuntimeError):
    """A computed path failed validate_order(); indicates a bug."""


def _fmt(x: float) -> str:
    return f"{x:g}"


def order_steps(store: GraphStore, p: Problem, skills: Iterable[str]) -> list[str]:
    """Topological order of the induced prerequisite subgraph, cheapest/alphabetical first."""
    sub = store.graph.subgraph(skills)
    return list(nx.lexicographical_topological_sort(
        sub, key=lambda n: (p.cost[n], store.names[n])))


def _route(store: GraphStore, p: Problem, option: str, memo: dict) -> str:
    skills = closure(store, p, option, memo)
    return " → ".join(store.names[n] for n in order_steps(store, p, skills))


def _rationale(store: GraphStore, p: Problem, s: str, in_path: frozenset[str], memo: dict) -> str:
    names = store.names
    parts: list[str] = []
    reqs = [r for r in p.unmet if s in r.any_of]
    if reqs:
        r = max(reqs, key=lambda x: x.min_rank)
        opts = list(dict.fromkeys(r.any_of))
        if len(opts) > 1:
            label = r.label or " or ".join(names[o] for o in opts)
            costs = {o: sum(p.cost[x] for x in closure(store, p, o, memo)) for o in opts}
            best = min(costs, key=lambda o: (costs[o], names[o]))
            if costs[s] <= costs[best]:
                alt = min((o for o in opts if o != s), key=lambda o: (costs[o], names[o]))
                diff = costs[alt] - costs[s]
                if diff > 0:
                    parts.append(f"Chosen for '{label}' — {_route(store, p, s, memo)} route is "
                                 f"{_fmt(round(diff, 2))}h cheaper than {_route(store, p, alt, memo)} route.")
                else:
                    parts.append(f"Chosen for '{label}' — same effort as the {_route(store, p, alt, memo)} route.")
            elif store.demand[s] > store.demand[best]:
                parts.append(f"Alternative for '{label}': {names[s]} (higher market demand "
                             f"{store.demand[s]:g} vs {store.demand[best]:g}).")
            else:
                parts.append(f"Alternative for '{label}': {names[s]} "
                             f"({_fmt(round(costs[s] - costs[best], 2))}h more than {names[best]}).")
        elif p.held.get(s, 0) >= 1:
            parts.append(f"Upgrade from {RANK_NAMES[p.held[s]]} to {RANK_NAMES[p.target[s]]} — required by the role.")
        else:
            parts.append(f"Required for this role ({RANK_NAMES[p.target[s]]}).")
    elif p.held.get(s, 0) >= 1:
        parts.append(f"Upgrade from {RANK_NAMES[p.held[s]]} to {RANK_NAMES[p.target[s]]}.")

    dependants = sorted((x for x in store.graph.successors(s) if x in in_path), key=lambda x: names[x])
    if dependants:
        parts.append("Prerequisite for " + ", ".join(names[x] for x in dependants) + ".")
        for x in dependants:
            for members in store.groups[x].values():
                if s in members and len(members) > 1:
                    group_names = " / ".join(sorted(names[m] for m in members))
                    mc = {m: p.cost.get(m, float("inf")) for m in members}
                    why = "this one is cheapest" if mc[s] <= min(mc.values()) else "chosen for this route"
                    parts.append(f"(any one of {group_names} is needed for {names[x]} — {why}).")

    partners = sorted(names[c] for c in store.coreq[s] if c in in_path or p.held.get(c, 0) >= 1)
    if partners:
        parts.append("Often learned alongside " + ", ".join(partners) + ".")
    return " ".join(parts)


def compute_paths(store: GraphStore, held: dict[str, int], requirements: list[Requirement], *,
                  k: int = 3, alpha: float = 0.7, beta: float = 0.3, use_heuristic: bool = True,
                  max_states: int = 200_000, prune: bool = True,
                  cost_bound_ratio: float = 1.5, heuristic: str = "closure") -> dict:
    """Full API-P-1 pipeline; returns the response body as a dict."""
    t0 = time.perf_counter()
    p = prepare(store, held, requirements)
    algorithm = "a_star" if use_heuristic else "dijkstra"
    expanded, capped = 0, False
    to_primary: int | None = 0

    if not p.unmet:
        goals: list[frozenset[str]] = [frozenset()]
    else:
        res = astar_search(store, p, k, max_states, prune=prune, use_heuristic=use_heuristic,
                           cost_bound_ratio=cost_bound_ratio, heuristic=heuristic)
        expanded, capped = res.states_expanded, res.capped
        to_primary = res.states_to_primary
        goals = res.goals
        if not goals:
            goals = [greedy_fallback(store, p)]
            algorithm = "greedy_fallback"
            to_primary = None

    totals = [sum(p.cost[s] for s in g) for g in goals]
    max_cost = max(totals) or 1.0
    demands = [sum(store.demand[s] for s in g) / len(g) if g else 0.0 for g in goals]
    # Nothing to learn: a single zero-cost path with score 0.
    already_met = not p.unmet
    scored = sorted(
        ((0.0 if already_met else alpha * c / max_cost + beta * (1 - d), c, d, g)
         for c, d, g in zip(totals, demands, goals)),
        key=lambda x: (x[0], x[1]))[:k]

    memo: dict = {}
    paths = []
    for rank, (score, total, avg, g) in enumerate(scored, start=1):
        ordered = order_steps(store, p, g)
        if violations := validate_order(ordered, p.held, store):
            raise PathValidationError(f"Invalid order produced: {[v.to_dict() for v in violations]}")
        steps = [{
            "skillId": s, "order": i, "fromRank": p.held.get(s, 0), "toRank": p.target[s],
            "estCost": round(p.cost[s], 2), "rationale": _rationale(store, p, s, g, memo),
        } for i, s in enumerate(ordered, start=1)]
        paths.append({
            "rank": rank, "type": "primary" if rank == 1 else "alternative",
            "totalLearningCost": round(total, 2), "marketDemandAvg": round(avg, 3),
            "compositeScore": round(score, 3), "steps": steps,
        })
    return {
        "algorithm": algorithm,
        "stats": {"statesExpanded": expanded, "statesToPrimary": to_primary, "elapsedMs": round((time.perf_counter() - t0) * 1000, 1),
                  "capped": capped},
        "paths": paths,
    }
