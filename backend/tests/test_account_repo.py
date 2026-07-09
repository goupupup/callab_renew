from app.repositories.account_repo import AccountRepository


class FakeDatabase:
    def __init__(self):
        self.all_calls = []
        self.one_calls = []
        self.execute_calls = []

    def fetch_all(self, sql: str, params: dict):
        self.all_calls.append((sql, params))
        return []

    def fetch_one(self, sql: str, params: dict):
        self.one_calls.append((sql, params))
        return None

    def execute(self, sql: str, params: dict):
        self.execute_calls.append((sql, params))
        return {"rowsAffected": 1}


def test_account_repository_lists_twusrman_accounts():
    database = FakeDatabase()
    repo = AccountRepository(database)

    repo.list_accounts()

    sql, params = database.all_calls[0]
    assert "FROM CUSTCAL.TWUSRMAN" in sql
    assert "WHERE STATE = '1'" in sql
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


def test_account_repository_inserts_access_request_as_pending():
    database = FakeDatabase()
    repo = AccountRepository(database)

    repo.create_access_request(
        {
            "userId": "new@example.com",
            "password": "pw",
            "userName": "New User",
            "corpName": "Acme",
            "corpAddress": "Los Angeles",
            "telNo": None,
            "email": "contact@example.com",
        }
    )

    sql, params = database.execute_calls[0]
    assert "INSERT INTO CUSTCAL.TWUSRMAN" in sql
    assert "'0'" in sql
    assert params["userId"] == "new@example.com"
    assert params["corpAddress"] == "Los Angeles"


def test_account_repository_searches_customer_companies_from_tbsupman():
    database = FakeDatabase()
    repo = AccountRepository(database)

    repo.search_customer_companies("apple")

    sql, params = database.all_calls[0]
    assert "FROM EASYCAL.TBSUPMAN" in sql
    assert "TRIM(COID) as CORP_ID" in sql
    assert "TRIM(CONM) as CORP_NAME" in sql
    assert "ROWNUM <= 20" in sql
    assert params == {"q": "apple"}


def test_account_repository_approves_access_request():
    database = FakeDatabase()
    repo = AccountRepository(database)

    repo.approve_access_request(
        {
            "userId": "new@example.com",
            "corpId": "APPLE",
            "corpName": "Apple",
            "authority": "U",
            "corpType": "C",
        }
    )

    sql, params = database.execute_calls[0]
    assert "STATE = '1'" in sql
    assert "NVL(STATE, '0') <> '1'" in sql
    assert params["corpId"] == "APPLE"


def test_account_repository_rejects_pending_access_request_by_deleting_it():
    database = FakeDatabase()
    repo = AccountRepository(database)

    repo.reject_access_request("new@example.com")

    sql, params = database.execute_calls[0]
    assert "DELETE FROM CUSTCAL.TWUSRMAN" in sql
    assert "NVL(STATE, '0') <> '1'" in sql
    assert params == {"user_id": "new@example.com"}
