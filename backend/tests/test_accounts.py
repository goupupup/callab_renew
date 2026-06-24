from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser


class FakeAccountService:
    def __init__(self):
        self.calls = []

    def list_accounts(self):
        self.calls.append(("list",))
        return [{"USERID": "admin"}]

    def create_account(self, payload):
        self.calls.append(("create", payload))
        return {"success": True, "rowsAffected": 1}


def _client(role: str, service: FakeAccountService):
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, account_service=service))
    user = CurrentUser(
        user_id="user",
        name="User",
        corp_id="HCT",
        corp_name="HCT",
        role=role,
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))
    return client


def test_accounts_requires_master():
    client = _client("EMPLOYEE", FakeAccountService())

    response = client.get("/api/accounts")

    assert response.status_code == 403
    assert response.json() == {"detail": "Master role required"}


def test_master_can_list_accounts():
    client = _client("MASTER", FakeAccountService())

    response = client.get("/api/accounts")

    assert response.status_code == 200
    assert response.json() == [{"USERID": "admin"}]


def test_master_can_create_account():
    service = FakeAccountService()
    client = _client("MASTER", service)

    response = client.post(
        "/api/accounts",
        json={"userId": "new", "password": "pw", "userName": "New User"},
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert service.calls[0][0] == "create"
