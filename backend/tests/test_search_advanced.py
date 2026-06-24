from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser


class FakeSearchService:
    def __init__(self):
        self.calls = []

    def get_lookups(self):
        raise AssertionError("not used")

    def search_reg_no(self, user, q: str):
        self.calls.append(("reg-no", user, q))
        return [{"ISID": q}]

    def search_cal_no(self, user, q: str):
        self.calls.append(("cal-no", user, q))
        return [{"CIDU": q}]

    def search_model(self, user, q: str):
        self.calls.append(("model", user, q))
        return [{"MODL": q}]

    def search_ongoing(self, user, filters):
        self.calls.append(("ongoing", user, filters))
        return [{"ISID": "1001"}]

    def search_expirations(self, user, filters):
        self.calls.append(("expirations", user, filters))
        return [{"ISID": "1001"}]


def _client(role: str, service: FakeSearchService):
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, search_service=service))
    user = CurrentUser(
        user_id="user",
        name="User",
        corp_id="C001" if role == "USER" else "HCT",
        corp_name="Corp",
        role=role,
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))
    return client


def test_advanced_search_forbids_customer_user():
    client = _client("USER", FakeSearchService())

    response = client.get("/api/search/reg-no?q=1001")

    assert response.status_code == 403
    assert response.json() == {"detail": "Elevated role required"}


def test_reg_no_search_delegates_to_service():
    service = FakeSearchService()
    client = _client("EMPLOYEE", service)

    response = client.get("/api/search/reg-no?q=1001")

    assert response.status_code == 200
    assert response.json() == [{"ISID": "1001"}]
    assert service.calls[0][0] == "reg-no"


def test_cal_no_search_delegates_to_service():
    service = FakeSearchService()
    client = _client("EMPLOYEE", service)

    response = client.get("/api/search/cal-no?q=CAL1")

    assert response.status_code == 200
    assert response.json() == [{"CIDU": "CAL1"}]


def test_model_search_delegates_to_service():
    service = FakeSearchService()
    client = _client("EMPLOYEE", service)

    response = client.get("/api/search/model?q=MODEL")

    assert response.status_code == 200
    assert response.json() == [{"MODL": "MODEL"}]


def test_ongoing_search_delegates_filters_to_service():
    service = FakeSearchService()
    client = _client("EMPLOYEE", service)

    response = client.get("/api/search/ongoing?regno=1001&engineer=E1")

    assert response.status_code == 200
    assert service.calls[0][0] == "ongoing"
    assert service.calls[0][2]["regno"] == "1001"
    assert service.calls[0][2]["engineer"] == "E1"


def test_expiration_search_delegates_filters_to_service():
    service = FakeSearchService()
    client = _client("EMPLOYEE", service)

    response = client.get("/api/search/expirations?applicant=C001")

    assert response.status_code == 200
    assert service.calls[0][0] == "expirations"
    assert service.calls[0][2]["applicant"] == "C001"
