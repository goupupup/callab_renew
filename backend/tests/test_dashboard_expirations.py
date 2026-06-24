from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser


class FakeDashboardService:
    def list_expirations(self, user: CurrentUser):
        return [
            {
                "ISID": "1001",
                "NAEM_SUP": "Equipment",
                "MODL": "Model",
                "MNFC_NAME": "Maker",
                "SERN": "SN",
                "CUST_NAME": "Customer",
                "LAST": "20250101",
                "NEXT": "20260101",
                "TERM": "12",
                "MODE_NAME": "Mode",
                "OWNER_NAME": "Owner",
                "LOCATION_STATUS": "VISIT",
            }
        ]


def test_dashboard_expirations_requires_session():
    client = TestClient(create_app(dashboard_service=FakeDashboardService()))

    response = client.get("/api/dashboard/expirations")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_dashboard_expirations_returns_items_for_authenticated_user():
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, dashboard_service=FakeDashboardService()))
    user = CurrentUser(
        user_id="customer",
        name="Customer",
        corp_id="C001",
        corp_name="Customer",
        role="USER",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))

    response = client.get("/api/dashboard/expirations")

    assert response.status_code == 200
    assert response.json()[0]["ISID"] == "1001"
