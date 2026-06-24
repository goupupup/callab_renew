from app.repositories.search_repo import SearchRepository


class FakeDatabase:
    def __init__(self):
        self.calls = []

    def fetch_all(self, sql: str, params: dict):
        self.calls.append((sql, params))
        return []


def test_search_repository_loads_all_lookup_groups_with_static_sql():
    database = FakeDatabase()
    repo = SearchRepository(database)

    result = repo.get_lookups()

    assert result == {
        "types": [],
        "modes": [],
        "statuses": [],
        "suppliers": [],
        "employees": [],
        "subcontractors": [],
    }
    sql_text = "\n".join(sql for sql, _params in database.calls)
    assert "EASYCAL.TBTYPMAN" in sql_text
    assert "EASYCAL.TBMODMAN" in sql_text
    assert "EASYCAL.TBSTAMAN" in sql_text
    assert "EASYCAL.TBSUPMAN" in sql_text
    assert "EASYCAL.TBEMPMAN" in sql_text
    assert all(params == {} for _sql, params in database.calls)
