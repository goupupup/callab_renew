from app.repositories.search_repo import SearchRepository


class FakeDatabase:
    def __init__(self):
        self.calls = []

    def fetch_all(self, sql: str, params: dict):
        self.calls.append((sql, params))
        return []


def test_search_repository_reg_no_uses_bound_query():
    database = FakeDatabase()
    repo = SearchRepository(database)

    repo.search_reg_no("1001")

    sql, params = database.calls[0]
    assert "EASYCAL.TBMASMAN" in sql
    assert "UPPER(TRIM(a.ISID)) = UPPER(:q)" in sql
    assert params == {"q": "1001"}


def test_search_repository_cal_no_uses_bound_like_query():
    database = FakeDatabase()
    repo = SearchRepository(database)

    repo.search_cal_no("CAL1")

    sql, params = database.calls[0]
    assert "EASYCAL.TBCALMAN" in sql
    assert "LIKE UPPER(:q)" in sql
    assert params == {"q": "%CAL1%"}


def test_search_repository_ongoing_adds_optional_filters():
    database = FakeDatabase()
    repo = SearchRepository(database)

    repo.search_ongoing({"regno": "1001", "engineer": "E1"})

    sql, params = database.calls[0]
    assert "A.STAT = '02'" in sql
    assert "TRIM(A.ISID) = :regno" in sql
    assert "B.EMID = :engineer" in sql
    assert params == {"regno": "1001", "engineer": "E1"}
