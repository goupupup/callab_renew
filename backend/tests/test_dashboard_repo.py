from app.repositories.dashboard_repo import DashboardRepository


class FakeDatabase:
    def __init__(self):
        self.calls = []

    def fetch_one(self, sql: str, params: dict):
        self.calls.append(("one", sql, params))
        return {"TOTAL_EQUIPMENT": 10, "ONGOING_COUNT": 2, "EXPIRED_COUNT": 1}

    def fetch_all(self, sql: str, params: dict):
        self.calls.append(("all", sql, params))
        return []


def test_dashboard_repository_scopes_basic_stats_by_corp_id():
    database = FakeDatabase()
    repo = DashboardRepository(database)

    result = repo.get_basic_stats("C001", today="20260623")

    assert result == {"TOTAL_EQUIPMENT": 10, "ONGOING_COUNT": 2, "EXPIRED_COUNT": 1}
    _, sql, params = database.calls[0]
    assert "FROM EASYCAL.TBMASMAN" in sql
    assert "WHERE TRIM(CUST) = :corp_id" in sql
    assert params == {"corp_id": "C001", "today": "20260623"}


def test_dashboard_repository_company_stats_uses_bound_today_param():
    database = FakeDatabase()
    repo = DashboardRepository(database)

    repo.list_company_stats(today="20260623")

    _, sql, params = database.calls[0]
    assert "GROUP BY TRIM(m.CUST)" in sql
    assert params == {"today": "20260623"}
