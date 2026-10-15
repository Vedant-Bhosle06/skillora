"""In-memory graphs for tests (no MongoDB)."""
from graph_loader import GraphStore, build_graph
from search import Requirement


def _skill(slug, name, hours, demand):
    return {"slug": slug, "name": name, "estHours": hours, "marketDemand": demand}


def _edge(a, b, type_="prerequisite_of", group=None):
    return {"sourceSkillId": a, "targetSkillId": b, "type": type_, "group": group}


def worked_example() -> GraphStore:
    skills = [
        _skill("python", "Python", 40, 0.9), _skill("sql", "SQL", 30, 0.9),
        _skill("statistics", "Statistics", 30, 0.6), _skill("pandas", "Pandas", 25, 0.7),
        _skill("tableau", "Tableau", 25, 0.5), _skill("power-bi", "Power BI", 20, 0.8),
        _skill("excel", "Excel", 15, 0.7),
    ]
    edges = [_edge("python", "pandas"), _edge("excel", "power-bi"),
             _edge("excel", "sql", "corequisite_with")]
    return build_graph(skills, edges)


def worked_requirements() -> list[Requirement]:
    return [
        Requirement(["python"], 2), Requirement(["sql"], 2), Requirement(["statistics"], 1),
        Requirement(["pandas"], 1), Requirement(["tableau", "power-bi"], 1, "BI tool"),
    ]


WORKED_HELD = {"python": 1, "sql": 2}


def grouped_prereq() -> GraphStore:
    """deep-learning needs one of tensorflow / pytorch; both need python."""
    skills = [_skill("python", "Python", 40, 0.9), _skill("tensorflow", "TensorFlow", 30, 0.6),
              _skill("pytorch", "PyTorch", 20, 0.7), _skill("deep-learning", "Deep Learning", 40, 0.8)]
    edges = [_edge("python", "tensorflow"), _edge("python", "pytorch"),
             _edge("tensorflow", "deep-learning", group="dl"), _edge("pytorch", "deep-learning", group="dl")]
    return build_graph(skills, edges)


def wide_graph(n: int) -> GraphStore:
    """n independent OR-requirements a_i | b_i: 2**n minimal goals."""
    skills = []
    for i in range(n):
        skills += [_skill(f"a{i}", f"A{i}", 10 + i, 0.5), _skill(f"b{i}", f"B{i}", 11 + i, 0.6)]
    return build_graph(skills, [])


def wide_requirements(n: int) -> list[Requirement]:
    return [Requirement([f"a{i}", f"b{i}"], 1, f"pick {i}") for i in range(n)]


def cyclic_edges() -> GraphStore:
    skills = [_skill("a", "A", 10, 0.5), _skill("b", "B", 10, 0.5), _skill("c", "C", 10, 0.5),
              _skill("lonely", "Lonely", 10, 0.5)]
    return build_graph(skills, [_edge("a", "b"), _edge("b", "c"), _edge("c", "a")])


def lopsided_graph() -> GraphStore:
    """Like wide_graph(4) but b0 is very expensive, so cheap goals surface well before the search ends."""
    store = wide_graph(4)
    store.est_hours["b0"] = 1000.0
    return store


def three_options() -> GraphStore:
    """One OR-requirement x|y|z costing 10 / 12 / 50 (z is > 1.5x the cheapest)."""
    return build_graph([_skill("x", "X", 20, 0.5), _skill("y", "Y", 24, 0.5), _skill("z", "Z", 100, 0.5)], [])


def three_options_requirements() -> list[Requirement]:
    return [Requirement(["x", "y", "z"], 1, "pick one")]


def singles_plus_expensive_or() -> GraphStore:
    """Six single required skills (cost 10 each) plus an OR a|z (cost 10 / 50).

    A* knows the singles still to learn (h) and prunes every z-state at once;
    Dijkstra (h = 0) keeps expanding the cheap-looking partial z-states."""
    skills = [_skill(f"s{i}", f"S{i}", 20, 0.5) for i in range(6)]
    skills += [_skill("a", "A", 20, 0.5), _skill("z", "Z", 100, 0.5)]
    return build_graph(skills, [])


def singles_plus_expensive_or_requirements() -> list[Requirement]:
    return [Requirement([f"s{i}"], 1) for i in range(6)] + [Requirement(["a", "z"], 1, "pick one")]


def deep_chain() -> GraphStore:
    """Single required skill c5 behind a mandatory chain c0 -> ... -> c5, plus two OR choices."""
    skills = [_skill(f"c{i}", f"C{i}", 10 + i, 0.5) for i in range(6)]
    skills += [_skill("a", "A", 20, 0.5), _skill("z", "Z", 100, 0.5),
               _skill("b", "B", 22, 0.5), _skill("y", "Y", 90, 0.5)]
    edges = [_edge(f"c{i}", f"c{i + 1}") for i in range(5)]
    return build_graph(skills, edges)


def deep_chain_requirements() -> list[Requirement]:
    return [Requirement(["c5"], 1), Requirement(["a", "z"], 1, "pick"), Requirement(["b", "y"], 1, "pick2")]
