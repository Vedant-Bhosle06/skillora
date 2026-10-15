import pytest

from search import (Requirement, UnknownSkillError, astar_search, compute_paths, prepare)
from tests.fixtures import (WORKED_HELD, grouped_prereq, lopsided_graph, singles_plus_expensive_or,
                            singles_plus_expensive_or_requirements, three_options,
                            three_options_requirements, wide_graph, wide_requirements,
                            worked_example, worked_requirements)


def run(store=None, held=None, reqs=None, **kw):
    return compute_paths(store or worked_example(), WORKED_HELD if held is None else held,
                         reqs or worked_requirements(), **kw)


def ids(path):
    return [s["skillId"] for s in path["steps"]]


def test_worked_example_plans():
    out = run()
    a, b = out["paths"][0], out["paths"][1]
    assert out["algorithm"] == "a_star" and a["type"] == "primary" and b["type"] == "alternative"
    assert set(ids(a)) == {"python", "statistics", "pandas", "tableau"}
    assert (a["totalLearningCost"], a["marketDemandAvg"], a["compositeScore"]) == (60, 0.675, 0.744)
    assert set(ids(b)) == {"python", "statistics", "pandas", "excel", "power-bi"}
    assert (b["totalLearningCost"], b["marketDemandAvg"], b["compositeScore"]) == (65, 0.74, 0.778)
    assert len(out["paths"]) == 2          # supersets (Plan A + Excel) were dropped
    assert out["stats"]["capped"] is False


def test_alpha_beta_flip():
    out = run(alpha=0.4, beta=0.6)
    assert out["paths"][0]["totalLearningCost"] == 65 and out["paths"][0]["compositeScore"] == 0.556
    assert out["paths"][1]["compositeScore"] == 0.564


def test_initial_heuristic():
    store = worked_example()
    p = prepare(store, WORKED_HELD, worked_requirements())
    assert astar_search(store, p, 3, 1000).initial_h == 47.5


def test_step_order_and_held_rule():
    a = run()["paths"][0]
    assert ids(a) == ["tableau", "statistics", "python", "pandas"]
    assert "sql" not in ids(a)
    py = a["steps"][2]
    assert (py["fromRank"], py["toRank"], py["estCost"], py["order"]) == (1, 2, 20, 3)


def test_prerequisite_met_at_any_rank():
    # Pandas needs Python; holding Python at beginner is enough so Python is not re-learned for it.
    out = run(held={"python": 2}, reqs=[Requirement(["pandas"], 1)])
    assert ids(out["paths"][0]) == ["pandas"]


def test_group_prereq_unlocked_by_either_member():
    store = grouped_prereq()
    reqs = [Requirement(["deep-learning"], 1)]
    out = run(store, {}, reqs)
    primary = out["paths"][0]
    assert ids(primary) == ["python", "pytorch", "deep-learning"]
    assert "any one of PyTorch / TensorFlow" in primary["steps"][1]["rationale"]
    assert {frozenset(ids(p)) for p in out["paths"]} == {
        frozenset({"python", "pytorch", "deep-learning"}), frozenset({"python", "tensorflow", "deep-learning"})}
    # holding TensorFlow alone satisfies the group
    out = run(store, {"tensorflow": 1}, reqs)
    assert ids(out["paths"][0]) == ["deep-learning"]


def goal_sets(store, held, reqs, **kw):
    p = prepare(store, held, reqs)
    return set(astar_search(store, p, 3, 10**6, **kw).goals)


def test_dijkstra_same_goals_more_states():
    store, reqs = worked_example(), worked_requirements()
    p = prepare(store, WORKED_HELD, reqs)
    a = astar_search(store, p, 3, 10**6)
    d = astar_search(store, p, 3, 10**6, use_heuristic=False)
    assert set(a.goals) == set(d.goals)
    assert d.states_expanded >= a.states_expanded
    out = run(use_heuristic=False)
    assert out["algorithm"] == "dijkstra" and out["paths"][0]["totalLearningCost"] == 60


def test_pruning_does_not_change_goals():
    for store, held, reqs in [(worked_example(), WORKED_HELD, worked_requirements()),
                              (grouped_prereq(), {}, [Requirement(["deep-learning"], 1)]),
                              (wide_graph(3), {}, wide_requirements(3))]:
        assert goal_sets(store, held, reqs) == goal_sets(store, held, reqs, prune=False)


def test_cap_without_goals_uses_greedy():
    out = run(wide_graph(8), {}, wide_requirements(8), max_states=5)
    assert out["algorithm"] == "greedy_fallback" and out["stats"]["capped"] is True
    assert len(out["paths"]) == 1 and len(out["paths"][0]["steps"]) == 8


def test_cap_with_goals_returns_them():
    out = run(lopsided_graph(), {}, wide_requirements(4), k=5, max_states=60,
              cost_bound_ratio=1000)
    assert out["algorithm"] == "a_star" and out["stats"]["capped"] is True
    assert len(out["paths"]) >= 1


def test_greedy_handles_group_prereqs():
    out = run(grouped_prereq(), {}, [Requirement(["deep-learning"], 1)], max_states=0)
    assert out["algorithm"] == "greedy_fallback"
    assert ids(out["paths"][0]) == ["python", "pytorch", "deep-learning"]


def test_all_met_gives_empty_primary():
    out = run(held={"python": 2, "sql": 2, "statistics": 1, "pandas": 1, "tableau": 1})
    assert len(out["paths"]) == 1
    p = out["paths"][0]
    assert p["type"] == "primary" and p["steps"] == [] and p["totalLearningCost"] == 0


def test_unknown_skill_id():
    with pytest.raises(UnknownSkillError):
        run(reqs=[Requirement(["nope"], 1)])


def test_unknown_held_skill_ignored():
    assert run(held={**WORKED_HELD, "ghost": 3})["paths"][0]["totalLearningCost"] == 60


def test_single_route_only_one_path():
    out = run(held={**WORKED_HELD, "tableau": 1})
    assert len(out["paths"]) == 1 and out["paths"][0]["totalLearningCost"] == 47.5


def test_k_limits_results():
    assert len(run(wide_graph(3), {}, wide_requirements(3), k=2)["paths"]) == 2


def test_rationales():
    out = run()
    a, b = out["paths"]
    assert "'BI tool'" in a["steps"][0]["rationale"] and "5h cheaper" in a["steps"][0]["rationale"]
    assert "Alternative for 'BI tool'" in b["steps"][1]["rationale"]
    assert "Prerequisite for Power BI" in b["steps"][0]["rationale"]
    assert "Often learned alongside SQL" in b["steps"][0]["rationale"]
    assert "Upgrade from beginner to intermediate" in a["steps"][2]["rationale"]
    assert a["steps"][1]["rationale"] == "Required for this role (beginner)."


def test_empty_label_falls_back_to_option_names():
    reqs = worked_requirements()
    reqs[-1] = Requirement(["tableau", "power-bi"], 1, "")
    assert "'Tableau or Power BI'" in run(reqs=reqs)["paths"][0]["steps"][0]["rationale"]


def test_rationale_alternative_costlier_without_demand_edge():
    store = worked_example()
    store.demand["power-bi"] = 0.1
    b = run(store)["paths"][1]
    assert "more than Tableau" in b["steps"][1]["rationale"]


def test_equal_cost_options():
    store = wide_graph(1)
    store.est_hours["b0"] = store.est_hours["a0"]
    out = run(store, {}, wide_requirements(1))
    assert "same effort" in out["paths"][0]["steps"][0]["rationale"]


def costs(out):
    return [p["totalLearningCost"] for p in out["paths"]]


def test_worked_example_within_bound():
    # 65 <= 1.5 x 60 = 90, so Plan B survives the default bound.
    out = run()
    assert costs(out) == [60, 65]
    assert out["stats"]["statesToPrimary"] is not None


def test_cost_bound_excludes_expensive_third_option():
    store, reqs = three_options(), three_options_requirements()
    assert costs(run(store, {}, reqs)) == [10, 12]                       # z (50) > 1.5 x 10
    assert costs(run(store, {}, reqs, cost_bound_ratio=10)) == [10, 12, 50]
    assert costs(run(store, {}, reqs, cost_bound_ratio=1.2)) == [10, 12]  # 12 <= 12 (epsilon-safe)
    assert costs(run(store, {}, reqs, cost_bound_ratio=1.0)) == [10]


def test_states_to_primary_le_expanded_and_astar_le_dijkstra():
    for store, held, reqs in [(worked_example(), WORKED_HELD, worked_requirements()),
                              (singles_plus_expensive_or(), {}, singles_plus_expensive_or_requirements())]:
        a = run(store, held, reqs)["stats"]
        d = run(store, held, reqs, use_heuristic=False)["stats"]
        for s in (a, d):
            assert 0 < s["statesToPrimary"] <= s["statesExpanded"]
        assert a["statesToPrimary"] <= d["statesToPrimary"]


def test_astar_expands_fewer_states_than_dijkstra_with_bound():
    store, reqs = singles_plus_expensive_or(), singles_plus_expensive_or_requirements()
    a, d = run(store, {}, reqs), run(store, {}, reqs, use_heuristic=False)
    assert costs(a) == costs(d) == [70]
    assert a["stats"]["statesExpanded"] < d["stats"]["statesExpanded"]
    assert a["stats"]["statesToPrimary"] < d["stats"]["statesToPrimary"]
    # with a generous bound the expensive route is returned by both
    assert costs(run(store, {}, reqs, cost_bound_ratio=10)) == [70, 110]
    assert costs(run(store, {}, reqs, cost_bound_ratio=10, use_heuristic=False)) == [70, 110]


def test_states_to_primary_null_for_greedy_and_zero_when_met():
    out = run(wide_graph(8), {}, wide_requirements(8), max_states=5)
    assert out["algorithm"] == "greedy_fallback" and out["stats"]["statesToPrimary"] is None
    met = run(held={"python": 2, "sql": 2, "statistics": 1, "pandas": 1, "tableau": 1})
    assert met["stats"]["statesToPrimary"] == 0


# ---------------------------------------------------------------------------
# Heuristic variants: closure / simple / dijkstra
# ---------------------------------------------------------------------------
import itertools
from pathlib import Path

from graph_loader import load_from_json
from tests.fixtures import deep_chain, deep_chain_requirements

FIXTURES = [
    (worked_example, WORKED_HELD, worked_requirements),
    (worked_example, {}, worked_requirements),
    (grouped_prereq, {}, lambda: [Requirement(["deep-learning"], 1)]),
    (lambda: wide_graph(3), {}, lambda: wide_requirements(3)),
    (three_options, {}, three_options_requirements),
    (singles_plus_expensive_or, {}, singles_plus_expensive_or_requirements),
    (deep_chain, {}, deep_chain_requirements),
    (deep_chain, {"c2": 1}, deep_chain_requirements),
]
MODES = [dict(heuristic="closure"), dict(heuristic="simple"), dict(use_heuristic=False)]


def test_initial_h_simple_and_closure_worked_example():
    store = worked_example()
    p = prepare(store, WORKED_HELD, worked_requirements())
    assert astar_search(store, p, 3, 1000, heuristic="simple").initial_h == 47.5
    assert astar_search(store, p, 3, 1000, heuristic="closure").initial_h == 47.5
    assert astar_search(store, p, 3, 1000, use_heuristic=False).initial_h == 0


def test_closure_h_larger_on_deep_chain():
    store = deep_chain()
    p = prepare(store, {}, deep_chain_requirements())
    assert p.must == {f"c{i}" for i in range(6)}
    assert astar_search(store, p, 3, 10**6, heuristic="closure").initial_h > \
        astar_search(store, p, 3, 10**6, heuristic="simple").initial_h


def test_unknown_heuristic_value_raises():
    store = worked_example()
    p = prepare(store, WORKED_HELD, worked_requirements())
    with pytest.raises(ValueError):
        astar_search(store, p, 3, 100, heuristic="bogus")


def test_modes_identical_goals_and_costs_on_fixtures():
    for mk_store, held, mk_reqs in FIXTURES:
        store, reqs = mk_store(), mk_reqs()
        outs = [compute_paths(store, held, reqs, **m) for m in MODES]
        assert costs(outs[0]) == costs(outs[1]) == costs(outs[2])
        sets = [{frozenset(ids(pt)) for pt in o["paths"]} for o in outs]
        assert sets[0] == sets[1] == sets[2]
        p = prepare(store, held, reqs)
        gs = [set(astar_search(store, p, 3, 10**6, **m).goals) for m in MODES]
        assert gs[0] == gs[1] == gs[2]


def test_closure_states_le_simple_and_strictly_less_on_deep_chain():
    for mk_store, held, mk_reqs in FIXTURES:
        store, reqs = mk_store(), mk_reqs()
        c = compute_paths(store, held, reqs, heuristic="closure")["stats"]
        s = compute_paths(store, held, reqs, heuristic="simple")["stats"]
        assert c["statesExpanded"] <= s["statesExpanded"]
    store, reqs = deep_chain(), deep_chain_requirements()
    c = compute_paths(store, {}, reqs, heuristic="closure")["stats"]
    s = compute_paths(store, {}, reqs, heuristic="simple")["stats"]
    assert c["statesExpanded"] < s["statesExpanded"]


def _optimal_remaining(store, p, learned):
    """Brute-force cheapest completion from `learned` (plain Dijkstra over the same moves, no pruning)."""
    from search import _unlocked
    unmet_opts = [set(r.any_of) for r in p.unmet]
    best = {learned: 0.0}
    heap = [(0.0, 0, learned)]
    tie = itertools.count(1)
    import heapq
    while heap:
        g, _, cur = heapq.heappop(heap)
        if g > best[cur]:
            continue
        if all(o & cur for o in unmet_opts):
            return g
        for s in sorted(p.relevant - cur):
            if _unlocked(s, cur, p, store):
                nxt = cur | {s}
                g2 = g + p.cost[s]
                if g2 < best.get(nxt, float("inf")):
                    best[nxt] = g2
                    heapq.heappush(heap, (g2, next(tie), nxt))
    return float("inf")


def _reachable_states(store, p):
    from search import _unlocked
    seen = {frozenset()}
    stack = [frozenset()]
    while stack:
        cur = stack.pop()
        for s in p.relevant - cur:
            if _unlocked(s, cur, p, store):
                nxt = cur | {s}
                if nxt not in seen:
                    seen.add(nxt)
                    stack.append(nxt)
    return seen


def test_heuristics_admissible_consistent_and_zero_at_goal():
    for mk_store, held, mk_reqs in FIXTURES:
        store, reqs = mk_store(), mk_reqs()
        p = prepare(store, held, reqs)
        unmet_opts = [set(r.any_of) for r in p.unmet]
        for name, hset in (("closure", p.must), ("simple", frozenset(p.singles))):
            h = lambda L: sum(p.cost[s] for s in hset if s not in L)  # noqa: E731
            for L in _reachable_states(store, p):
                opt = _optimal_remaining(store, p, L)
                assert h(L) <= opt + 1e-9, (name, sorted(L))
                if all(o & L for o in unmet_opts):
                    assert h(L) == 0, (name, sorted(L))
                from search import _unlocked
                for s in p.relevant - L:
                    if _unlocked(s, L, p, store):
                        assert h(L) <= p.cost[s] + h(L | {s}) + 1e-9


DATA = Path(__file__).resolve().parents[2] / "data" / "v1"


@pytest.mark.skipif(not (DATA / "roles.json").exists(), reason="dataset not present")
def test_real_dataset_modes_agree():
    import json
    from tools.check_dataset import role_requirements
    store = load_from_json(DATA)
    roles = {r["slug"]: r for r in json.loads((DATA / "roles.json").read_text())}
    for slug in ["data-analyst", "machine-learning-engineer", "devops-engineer", "full-stack-mern-developer"]:
        if slug not in roles:
            continue
        reqs = role_requirements(roles[slug])
        outs = [compute_paths(store, {}, reqs, **m) for m in MODES]
        assert costs(outs[0]) == costs(outs[1]) == costs(outs[2])
        sets = [{frozenset(ids(pt)) for pt in o["paths"]} for o in outs]
        assert sets[0] == sets[1] == sets[2]
        assert outs[0]["stats"]["statesExpanded"] <= outs[1]["stats"]["statesExpanded"]
