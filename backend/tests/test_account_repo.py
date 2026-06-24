from app.repositories.account_repo import AccountRepository


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


def test_account_repository_lists_twusrman_accounts():
    database = FakeDatabase()
    repo = AccountRepository(database)

    repo.list_accounts()

    sql, params = database.all_calls[0]
    assert "FROM CUSTCAL.TWUSRMAN" in sql
    assert "ORDER BY REGDATE DESC" in sql
    assert params == {}


def test_account_repository_inserts_account_with_bound_params():
    database = FakeDatabase()
    repo = AccountRepository(database)

    repo.create_account({"userId": "new", "password": "pw", "userName": "New User"})

    sql, params = database.execute_calls[0]
    assert "INSERT INTO CUSTCAL.TWUSRMAN" in sql
    assert params["userId"] == "new"
    assert params["password"] == "pw"
    assert params["userName"] == "New User"
