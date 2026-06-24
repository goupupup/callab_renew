from fastapi.testclient import TestClient

from app.main import create_app


def test_auth_me_requires_session():
    client = TestClient(create_app())

    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}
