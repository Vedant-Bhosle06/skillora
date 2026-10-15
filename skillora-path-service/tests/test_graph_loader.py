from bson import ObjectId

import config
from graph_loader import build_graph, load_from_json, load_from_mongo
from tests.fixtures import worked_example


def test_corequisites_excluded_from_digraph():
    s = worked_example()
    assert s.graph.number_of_edges() == 2 and s.corequisite_edge_count == 1
    assert s.coreq["sql"] == {"excel"} and s.coreq["excel"] == {"sql"}
    assert s.mandatory["pandas"] == {"python"} and s.loaded


def test_est_hours_fallback_and_isolated_nodes():
    s = build_graph([{"slug": "x", "name": "X", "baseDifficulty": 4, "marketDemand": 0.3}], [])
    assert s.est_hours["x"] == 32 and "x" in s.graph


def test_groups_and_unknown_edge_endpoint():
    skills = [{"slug": c, "name": c, "estHours": 1} for c in "abc"]
    edges = [{"sourceSkillId": "a", "targetSkillId": "c", "type": "prerequisite_of", "group": "g"},
             {"sourceSkillId": "b", "targetSkillId": "c", "type": "prerequisite_of", "group": "g"},
             {"sourceSkillId": "zzz", "targetSkillId": "c", "type": "prerequisite_of"},
             {"sourceSkillId": "a", "targetSkillId": "b", "type": "weird"}]
    s = build_graph(skills, edges)
    assert s.groups["c"] == {"g": {"a", "b"}} and s.group_count == 1 and s.graph.number_of_edges() == 2


class FakeDb(dict):
    def __getitem__(self, name):
        self.asked = getattr(self, "asked", []) + [name]
        return super().__getitem__(name)


class FakeColl:
    def __init__(self, docs):
        self.docs = docs

    def find(self):
        return iter(self.docs)


def test_load_from_mongo_uses_configured_collections(monkeypatch):
    monkeypatch.setenv("EDGES_COLLECTION", "my_edges")
    a, b = ObjectId(), ObjectId()
    db = FakeDb(skills=FakeColl([{"_id": a, "slug": "a", "name": "A", "estHours": 5},
                                 {"_id": b, "slug": "b", "name": "B", "estHours": 5}]),
                my_edges=FakeColl([{"sourceSkillId": a, "targetSkillId": b, "type": "prerequisite_of", "group": None}]))
    s = load_from_mongo(db)
    assert db.asked == ["skills", "my_edges"]
    assert s.graph.has_edge(str(a), str(b)) and s.slugs[str(a)] == "a"
    assert config.edges_collection() == "my_edges"


def test_load_from_json(tmp_path):
    (tmp_path / "skills.json").write_text('[{"slug":"a","name":"A","estHours":1},{"slug":"b","name":"B","estHours":1}]')
    (tmp_path / "edges.json").write_text('[{"sourceSkillId":"a","targetSkillId":"b","type":"prerequisite_of","group":null}]')
    assert load_from_json(tmp_path).graph.has_edge("a", "b")
