import pytest

from tests.fixtures import grouped_prereq, worked_example
from validate import validate_order


def test_valid_order_passes():
    assert validate_order(["python", "pandas"], {}, worked_example()) == []


def test_swapped_order_fails():
    v = validate_order(["pandas", "python"], {}, worked_example())
    assert len(v) == 1 and v[0].skill_id == "pandas" and v[0].missing == ["python"] and v[0].position == 1
    assert v[0].to_dict()["order"] == 1


def test_group_without_member_fails():
    v = validate_order(["deep-learning"], {}, grouped_prereq())
    assert v[0].unsatisfied_groups == ["dl"]
    assert validate_order(["pytorch", "deep-learning"], {"python": 1}, grouped_prereq()) == []


def test_held_prereq_satisfies():
    assert validate_order(["pandas"], {"python": 1}, worked_example()) == []


def test_upgrade_of_held_skill_allowed():
    assert validate_order(["pandas"], {"pandas": 1}, worked_example()) == []


def test_unknown_id():
    with pytest.raises(KeyError):
        validate_order(["zzz"], {}, worked_example())
