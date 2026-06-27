from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser


class FakeAccountService:
    def get_my_account(self, user):
        return {
            "userId": user.user_id,
            "userName": "Existing User",
            "corpId": "C001",
            "corpName": "Customer Corp",
            "telNo": "510-000-0000",
            "email": "user@example.com",
        }

    def update_my_account(self, user, payload):
        return {
            "success": True,
            "account": {
                "userId": user.user_id,
                "userName": "Existing User",
                "corpId": "C001",
                "corpName": "Customer Corp",
                "telNo": payload.telNo,
                "email": payload.email,
            },
        }


def _authenticated_client():
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, account_service=FakeAccountService()))
    user = CurrentUser(
        user_id="customer",
        name="Customer",
        corp_id="C001",
        corp_name="Customer Corp",
        role="USER",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))
    return client


def test_my_account_requires_session():
    client = TestClient(create_app(account_service=FakeAccountService()))

    response = client.get("/api/account")

    assert response.status_code == 401


def test_my_account_returns_authenticated_user_profile():
    client = _authenticated_client()

    response = client.get("/api/account")

    assert response.status_code == 200
    assert response.json()["userId"] == "customer"
    assert response.json()["corpName"] == "Customer Corp"


def test_my_account_update_accepts_profile_fields():
    client = _authenticated_client()

    response = client.put(
        "/api/account",
        json={
            "telNo": "510-111-2222",
            "email": "changed@example.com",
            "currentPassword": "old-password",
            "password": "new-password",
        },
    )

    assert response.status_code == 200
    assert response.json()["account"]["telNo"] == "510-111-2222"
