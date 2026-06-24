from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser


class FakeSearchService:
    def get_lookups(self):
        raise AssertionError("not used")

    def search_master(self, filters):
        return [{"MDLNO": "M1"}]

    def search_model_advanced(self, user, filters):
        return [{"ISID": "1001"}]

    def search_cal_history(self, user, filters):
        return [{"CIDU": "CAL2"}]

    def get_cal_history(self, isid: str):
        return [{"CIDU": "CAL1"}]


class FakeEquipmentService:
    def update(self, user, equipment_id, payload):
        return {"success": True}


def _client(role="EMPLOYEE"):
    settings = Settings(session_secret="test-secret")
    client = TestClient(
        create_app(
            settings=settings,
            search_service=FakeSearchService(),
            equipment_service=FakeEquipmentService(),
        )
    )
    user = CurrentUser(
        user_id="user",
        name="User",
        corp_id="HCT",
        corp_name="HCT",
        role=role,
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))
    return client


def test_search_master_endpoint():
    response = _client().get("/api/search/master?name=Gauge")

    assert response.status_code == 200
    assert response.json() == [{"MDLNO": "M1"}]


def test_cal_history_endpoint():
    response = _client().get("/api/search/cal-history?isid=1001")

    assert response.status_code == 200
    assert response.json() == [{"CIDU": "CAL1"}]


def test_advanced_model_endpoint_uses_filter_search():
    response = _client().get("/api/search/model?cust=C001")

    assert response.status_code == 200
    assert response.json() == [{"ISID": "1001"}]


def test_advanced_cal_history_endpoint_uses_filter_search():
    response = _client().get("/api/search/cal-no?isid=1001")

    assert response.status_code == 200
    assert response.json() == [{"CIDU": "CAL2"}]


def test_equipment_update_endpoint_requires_elevated_user():
    response = _client("USER").put("/api/equipment/1001", json={"MEMO": "x"})

    assert response.status_code == 403


def test_equipment_update_endpoint_for_elevated_user():
    response = _client("EMPLOYEE").put("/api/equipment/1001", json={"MEMO": "x"})

    assert response.status_code == 200
    assert response.json() == {"success": True}
