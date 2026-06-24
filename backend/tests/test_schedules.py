from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser


class FakeScheduleService:
    def __init__(self):
        self.calls = []

    def list_schedules(self):
        self.calls.append(("list",))
        return [{"SCHID": "1", "STARTDATE": "2026-01-01"}]

    def list_employees(self):
        return [{"ID": "E1", "NAME": "[E1] Engineer"}]

    def create_schedule(self, payload):
        self.calls.append(("create", payload))
        return {"success": True, "id": "1"}

    def update_schedule(self, schedule_id, payload):
        self.calls.append(("update", schedule_id, payload))
        return {"success": True}

    def delete_schedule(self, schedule_id):
        self.calls.append(("delete", schedule_id))
        return {"success": True}


def _client(role: str, service: FakeScheduleService):
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, schedule_service=service))
    user = CurrentUser(
        user_id="user",
        name="User",
        corp_id="HCT",
        corp_name="HCT",
        role=role,
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))
    return client


def test_schedules_requires_elevated_user():
    client = _client("USER", FakeScheduleService())

    response = client.get("/api/schedules")

    assert response.status_code == 403
    assert response.json() == {"detail": "Elevated role required"}


def test_list_schedules_for_employee():
    service = FakeScheduleService()
    client = _client("EMPLOYEE", service)

    response = client.get("/api/schedules")

    assert response.status_code == 200
    assert response.json() == [{"SCHID": "1", "STARTDATE": "2026-01-01"}]


def test_schedule_mutation_requires_master():
    client = _client("EMPLOYEE", FakeScheduleService())

    response = client.post("/api/schedules", json={"startDate": "2026-01-01"})

    assert response.status_code == 403
    assert response.json() == {"detail": "Master role required"}


def test_master_can_create_update_and_delete_schedule():
    service = FakeScheduleService()
    client = _client("MASTER", service)

    create_response = client.post("/api/schedules", json={"startDate": "2026-01-01"})
    update_response = client.put("/api/schedules/1", json={"memo": "Updated"})
    delete_response = client.delete("/api/schedules/1")

    assert create_response.status_code == 200
    assert update_response.status_code == 200
    assert delete_response.status_code == 200
    assert service.calls[0][0] == "create"
    assert service.calls[1][0] == "update"
    assert service.calls[2] == ("delete", "1")
