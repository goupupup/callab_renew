from app.repositories.schedule_repo import ScheduleRepository


class FakeDatabase:
    def __init__(self):
        self.all_calls = []
        self.execute_calls = []

    def fetch_all(self, sql: str, params: dict):
        self.all_calls.append((sql, params))
        return []

    def execute(self, sql: str, params: dict):
        self.execute_calls.append((sql, params))
        return {"rowsAffected": 1}


def test_schedule_repository_lists_recent_schedules():
    database = FakeDatabase()
    repo = ScheduleRepository(database)

    repo.list_schedules()

    sql, params = database.all_calls[0]
    assert "FROM EASYCAL.TBSCHMAN" in sql
    assert "STARTDATE >= ADD_MONTHS(SYSDATE, -6)" in sql
    assert params == {}


def test_schedule_repository_deletes_by_bound_schedule_id():
    database = FakeDatabase()
    repo = ScheduleRepository(database)

    repo.delete_schedule("1")

    sql, params = database.execute_calls[0]
    assert "DELETE FROM EASYCAL.TBSCHMAN" in sql
    assert "TRIM(SCHID) = :schedule_id" in sql
    assert params == {"schedule_id": "1"}
