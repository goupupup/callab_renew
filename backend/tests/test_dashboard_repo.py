from app.repositories.dashboard_repo import DashboardRepository


class FakeDatabase:
    def __init__(self):
        self.one_calls = []
        self.all_calls = []

    def fetch_one(self, sql: str, params: dict):
        self.one_calls.append((sql, params))
        return {}

    def fetch_all(self, sql: str, params: dict):
        self.all_calls.append((sql, params))
        return []


def test_basic_stats_uses_same_expiration_condition_as_equipment_filter():
    database = FakeDatabase()
    repo = DashboardRepository(database)

    repo.get_basic_stats(corp_id="APPLE", today="20260708")

    sql, params = database.one_calls[0]
    assert "NEXT <> '0' AND NEXT < :today" in sql
    assert "STAT = '10' AND NEXT" not in sql
    assert params == {"corp_id": "APPLE", "today": "20260708"}
