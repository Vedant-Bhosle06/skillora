import pytest
from fastapi.testclient import TestClient

from graph_loader import GraphStore
from main import create_app
from tests.fixtures import cyclic_edges, three_options, worked_example

KEY = {"X-Internal-Key": "secret"}
BODY = {
    "heldSkills": [{"skillId": "python", "rank": 1}, {"skillId": "sql", "rank": 2}],
    "requirements": [
        {"anyOf": ["python"], "minRank": 2}, {"anyOf": ["sql"], "minRank": 2},
        {"anyOf": ["statistics"], "minRank": 1}, {"anyOf": ["pandas"], "minRank": 1},
        {"anyOf": ["tableau", "power-bi"], "minRank": 1, "label": ""},
    ],
}


def client(loader=worked_example, **kw):
    return TestClient(create_app(loader, api_key="secret", **kw))


def test_health_needs_no_key():
    with client() as c:
        r = c.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok", "graphLoaded": True, "nodes": 7, "edges": 2}


def test_key_enforced():
    with client() as c:
        assert c.post("/compute/paths", json=BODY).status_code == 403
        assert c.post("/compute/paths", json=BODY, headers={"X-Internal-Key": "bad"}).status_code == 403
        assert c.get("/graph/metrics").status_code == 403
        assert c.post("/graph/reload").status_code == 403
        assert c.post("/graph/validate-order", json={"steps": []}).status_code == 403


def test_refuses_without_key(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    with pytest.raises(RuntimeError):
        create_app(worked_example)


def test_compute_happy_path():
    with client() as c:
        r = c.post("/compute/paths", json=BODY, headers=KEY)
        assert r.status_code == 200
        d = r.json()
        assert d["algorithm"] == "a_star" and set(d["stats"]) == {"statesExpanded", "statesToPrimary", "elapsedMs", "capped"}
        assert 0 < d["stats"]["statesToPrimary"] <= d["stats"]["statesExpanded"]
        assert [p["totalLearningCost"] for p in d["paths"]] == [60, 65]
        assert d["paths"][0]["steps"][0]["skillId"] == "tableau"
        d2 = c.post("/compute/paths", json={**BODY, "useHeuristic": False}, headers=KEY).json()
        assert d2["algorithm"] == "dijkstra"


def test_invalid_body_and_unknown_skill():
    with client() as c:
        assert c.post("/compute/paths", json={**BODY, "k": 9}, headers=KEY).status_code == 422
        bad = {**BODY, "requirements": [{"anyOf": ["nope"], "minRank": 1}]}
        r = c.post("/compute/paths", json=bad, headers=KEY)
        assert r.status_code == 422 and "nope" in r.json()["detail"]


def test_cap_from_app_config():
    body = {"requirements": [{"anyOf": ["tableau", "power-bi"], "minRank": 1}], "k": 1}
    with client(max_states=0) as c:
        assert c.post("/compute/paths", json=body, headers=KEY).json()["algorithm"] == "greedy_fallback"


def failing_loader():
    raise RuntimeError("mongo down")


def test_graph_not_loaded_gives_503():
    with client(failing_loader) as c:
        assert c.get("/health").json()["graphLoaded"] is False
        assert c.post("/compute/paths", json=BODY, headers=KEY).status_code == 503
        assert c.get("/graph/metrics", headers=KEY).status_code == 503
        assert c.post("/graph/reload", headers=KEY).status_code == 503


def test_metrics_dag_and_cyclic():
    with client() as c:
        m = c.get("/graph/metrics", headers=KEY).json()
        assert m["nodeCount"] == 7 and m["prerequisiteEdgeCount"] == 2 and m["corequisiteEdgeCount"] == 1
        assert m["isDAG"] is True and m["cycle"] is None and m["maxDepth"] == 1
        assert m["orphanCount"] == 3 and {o["skillId"] for o in m["orphans"]} == {"sql", "statistics", "tableau"}
        assert sorted(m["roots"]) == ["excel", "python"] and m["groupCount"] == 0
    with client(cyclic_edges) as c:
        m = c.get("/graph/metrics", headers=KEY).json()
        assert m["isDAG"] is False and set(m["cycle"]) == {"a", "b", "c"} and m["maxDepth"] is None
        assert m["orphanCount"] == 1


def test_reload_swaps_store_and_keeps_old_on_failure():
    state = {"n": 0}

    def loader():
        state["n"] += 1
        if state["n"] == 3:
            raise RuntimeError("down")
        return worked_example() if state["n"] == 1 else cyclic_edges()

    with client(loader) as c:
        assert c.get("/health").json()["nodes"] == 7
        r = c.post("/graph/reload", headers=KEY)
        assert r.json() == {"status": "reloaded", "nodes": 4, "edges": 3}
        assert c.get("/health").json()["nodes"] == 4
        assert c.post("/graph/reload", headers=KEY).status_code == 503
        assert c.get("/health").json()["nodes"] == 4


def test_validate_order_endpoint():
    with client() as c:
        r = c.post("/graph/validate-order", json={"steps": ["pandas", "python"]}, headers=KEY).json()
        assert r["violations"] == 1 and r["details"][0]["skillId"] == "pandas"
        ok = c.post("/graph/validate-order", headers=KEY,
                    json={"steps": ["pandas"], "heldSkills": [{"skillId": "python", "rank": 1}]}).json()
        assert ok["violations"] == 0
        assert c.post("/graph/validate-order", json={"steps": ["zzz"]}, headers=KEY).status_code == 422


def test_order_violation_returns_500(monkeypatch):
    import main
    monkeypatch.setattr(main, "compute_paths",
                        lambda *a, **k: (_ for _ in ()).throw(main.PathValidationError("bug")))
    with client() as c:
        assert c.post("/compute/paths", json=BODY, headers=KEY).status_code == 500


def test_lazy_app_attribute(monkeypatch):
    import main
    monkeypatch.setenv("INTERNAL_API_KEY", "k")
    monkeypatch.delattr(main, "app", raising=False)
    assert main.app.title == "Skillora Path Service"
    with pytest.raises(AttributeError):
        main.nothing


def test_cost_bound_ratio_request_field(monkeypatch):
    body = {"requirements": [{"anyOf": ["x", "y", "z"], "minRank": 1}]}
    with client(three_options) as c:
        assert c.post("/compute/paths", json={**body, "costBoundRatio": 0.5}, headers=KEY).status_code == 422
        r = c.post("/compute/paths", json=body, headers=KEY).json()
        assert [p["totalLearningCost"] for p in r["paths"]] == [10, 12]
        r = c.post("/compute/paths", json={**body, "costBoundRatio": 10}, headers=KEY).json()
        assert [p["totalLearningCost"] for p in r["paths"]] == [10, 12, 50]
    monkeypatch.setenv("COST_BOUND_RATIO", "10")   # env default applies when the field is omitted
    with client(three_options) as c:
        r = c.post("/compute/paths", json=body, headers=KEY).json()
        assert len(r["paths"]) == 3


def test_statistics_null_primary_on_greedy():
    body = {"requirements": [{"anyOf": ["tableau", "power-bi"], "minRank": 1}], "k": 1}
    with client(max_states=0) as c:
        assert c.post("/compute/paths", json=body, headers=KEY).json()["stats"]["statesToPrimary"] is None


def test_heuristic_field():
    with client() as c:
        base = c.post("/compute/paths", json=BODY, headers=KEY).json()
        for h in ("closure", "simple"):
            d = c.post("/compute/paths", json={**BODY, "heuristic": h}, headers=KEY)
            assert d.status_code == 200
            assert [p["totalLearningCost"] for p in d.json()["paths"]] == [60, 65]
        assert base["algorithm"] == "a_star"
        assert c.post("/compute/paths", json={**BODY, "heuristic": "bogus"}, headers=KEY).status_code == 422
        d = c.post("/compute/paths", json={**BODY, "heuristic": None}, headers=KEY)
        assert d.status_code == 200
