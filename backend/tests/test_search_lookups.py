from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser
from app.schemas.search import LookupItem, SearchLookups


class FakeSearchService:
    def get_lookups(self):
        return SearchLookups(
            types=[LookupItem(CODE="01", NAME="[01] Type")],
            modes=[],
            statuses=[],
            suppliers=[],
            employees=[],
            subcontractors=[],
        )


def test_search_lookups_requires_session():
    client = TestClient(create_app(search_service=FakeSearchService()))

    response = client.get("/api/search/lookups")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_search_lookups_forbids_customer_user():
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, search_service=FakeSearchService()))
    user = CurrentUser(
        user_id="customer",
        name="Customer",
        corp_id="C001",
        corp_name="Customer",
        role="USER",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))

    response = client.get("/api/search/lookups")

    assert response.status_code == 403
    assert response.json() == {"detail": "Elevated role required"}


def test_search_lookups_returns_lookup_groups_for_employee():
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, search_service=FakeSearchService()))
    user = CurrentUser(
        user_id="employee",
        name="Employee",
        corp_id="HCT",
        corp_name="HCT",
        role="EMPLOYEE",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))

    response = client.get("/api/search/lookups")

    assert response.status_code == 200
    assert response.json()["types"] == [{"CODE": "01", "NAME": "[01] Type"}]
