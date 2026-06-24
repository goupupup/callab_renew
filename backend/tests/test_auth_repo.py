from app.repositories.auth_repo import AuthRepository


class FakeDatabase:
    def __init__(self):
        self.sql = ""
        self.params = {}

    def fetch_one(self, sql: str, params: dict):
        self.sql = sql
        self.params = params
        return None


def test_auth_repository_uses_bound_parameter_for_user_lookup():
    database = FakeDatabase()
    repo = AuthRepository(database)

    repo.find_active_user_by_id("admin")

    assert "CUSTCAL.TWUSRMAN" in database.sql
    assert "UPPER(USERID) = UPPER(:user_id)" in database.sql
    assert "STATE = '1'" in database.sql
    assert database.params == {"user_id": "admin"}
