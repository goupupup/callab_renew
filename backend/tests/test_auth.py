from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.auth import CurrentUser


class FakeAuthService:
    def authenticate(self, username: str, password: str):
        if username == "admin" and password == "correct-password":
            return CurrentUser(
                user_id="admin",
                name="Administrator",
                corp_id="HCT",
                corp_name="HCT",
                role="MASTER",
            )
        return None


class FailingAuthService:
    def authenticate(self, username: str, password: str):
        raise RuntimeError("database unavailable")


def test_auth_me_requires_session():
    client = TestClient(create_app())

    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_login_sets_http_only_session_cookie_and_auth_me_returns_user():
    client = TestClient(create_app(auth_service=FakeAuthService()))

    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "correct-password"},
    )

    assert login_response.status_code == 200
    assert login_response.json()["user"]["role"] == "MASTER"
    assert "callab_session" in login_response.cookies
    assert "httponly" in login_response.headers["set-cookie"].lower()

    me_response = client.get("/api/auth/me")

    assert me_response.status_code == 200
    assert me_response.json() == {
        "user_id": "admin",
        "name": "Administrator",
        "corp_id": "HCT",
        "corp_name": "HCT",
        "role": "MASTER",
    }


def test_logout_clears_session_cookie():
    client = TestClient(create_app(auth_service=FakeAuthService()))
    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "correct-password"},
    )
    assert login_response.status_code == 200

    logout_response = client.post("/api/auth/logout")

    assert logout_response.status_code == 200
    assert logout_response.json() == {"success": True}
    assert "callab_session=" in logout_response.headers["set-cookie"]
    assert "max-age=0" in logout_response.headers["set-cookie"].lower()


def test_login_failure_returns_generic_unauthorized_response():
    client = TestClient(create_app(auth_service=FakeAuthService()))

    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid ID or password"}


def test_login_backend_error_returns_generic_service_unavailable_response():
    client = TestClient(create_app(auth_service=FailingAuthService()))

    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "correct-password"},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Authentication service unavailable"}
