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

    def create_access_request(self, payload):
        self.calls.append(("request", payload))
        return {"success": True, "rowsAffected": 1}

    def list_access_requests(self):
        self.calls.append(("list_requests",))
        return [{"USERID": "new@example.com", "STATE": "0"}]

    def approve_access_request(self, payload):
        self.calls.append(("approve", payload))
        return {"success": True, "rowsAffected": 1}

    def reject_access_request(self, payload):
        self.calls.append(("reject", payload))
        return {"success": True, "rowsAffected": 1}

    def search_customer_companies(self, q):
        self.calls.append(("search_customers", q))
        return [{"CORP_ID": "APL01", "CORP_NAME": "APPLE INC"}]


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


def test_public_can_create_account_request_without_session():
    service = FakeAccountService()
    client = TestClient(create_app(account_service=service))

    response = client.post(
        "/api/account-requests",
        json={
            "email": "new@example.com",
            "password": "pw",
            "userName": "New User",
            "contactEmail": "contact@example.com",
            "phone": "",
            "companyName": "Acme",
            "companyLocation": "Los Angeles, CA",
        },
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert service.calls[0][0] == "request"


def test_master_can_list_account_requests():
    service = FakeAccountService()
    client = _client("MASTER", service)

    response = client.get("/api/account-requests")

    assert response.status_code == 200
    assert response.json() == [{"USERID": "new@example.com", "STATE": "0"}]


def test_master_can_approve_account_request():
    service = FakeAccountService()
    client = _client("MASTER", service)

    response = client.put(
        "/api/account-requests/approve",
        json={"userId": "new@example.com", "corpId": "APPLE", "corpName": "Apple", "authority": "U", "corpType": "C"},
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert service.calls[0][0] == "approve"


def test_master_can_reject_account_request():
    service = FakeAccountService()
    client = _client("MASTER", service)

    response = client.request(
        "DELETE",
        "/api/account-requests/reject",
        json={"userId": "new@example.com"},
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert service.calls[0][0] == "reject"


def test_master_can_search_customer_companies_for_approval():
    service = FakeAccountService()
    client = _client("MASTER", service)

    response = client.get("/api/account-requests/customers?q=apple")

    assert response.status_code == 200
    assert response.json() == [{"CORP_ID": "APL01", "CORP_NAME": "APPLE INC"}]
    assert service.calls[0] == ("search_customers", "apple")
