from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser


class FakeDashboardService:
    def get_stats(self, user: CurrentUser):
        if user.role == "MASTER":
            return {
                "totalEquipment": 100,
                "ongoingCount": 7,
                "upcomingExpirations": 3,
                "companyStats": [
                    {
                        "corpId": "HCT",
                        "corpName": "HCT",
                        "total": 100,
                        "ongoing": 7,
                        "expired": 3,
                    }
                ],
            }
        return {
            "totalEquipment": 10,
            "ongoingCount": 2,
            "upcomingExpirations": 1,
            "companyStats": None,
        }


def test_dashboard_stats_requires_session():
    client = TestClient(create_app(dashboard_service=FakeDashboardService()))

    response = client.get("/api/dashboard/stats")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_dashboard_stats_returns_customer_scoped_stats():
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, dashboard_service=FakeDashboardService()))
    user = CurrentUser(
        user_id="customer",
        name="Customer",
        corp_id="C001",
        corp_name="Customer Corp",
        role="USER",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))

    response = client.get("/api/dashboard/stats")

    assert response.status_code == 200
    assert response.json() == {
        "totalEquipment": 10,
        "ongoingCount": 2,
        "upcomingExpirations": 1,
        "companyStats": None,
    }


def test_dashboard_stats_includes_company_stats_for_master():
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, dashboard_service=FakeDashboardService()))
    user = CurrentUser(
        user_id="admin",
        name="Administrator",
        corp_id="HCT",
        corp_name="HCT",
        role="MASTER",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))

    response = client.get("/api/dashboard/stats")

    assert response.status_code == 200
    assert response.json()["companyStats"] == [
        {
            "corpId": "HCT",
            "corpName": "HCT",
            "total": 100,
            "ongoing": 7,
            "expired": 3,
        }
    ]
