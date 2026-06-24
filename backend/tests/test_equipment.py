from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser
from app.schemas.equipment import EquipmentListResponse, EquipmentPagination


class FakeEquipmentService:
    def __init__(self):
        self.query = None

    def search(self, user: CurrentUser, query):
        self.query = query
        return EquipmentListResponse(
            data=[],
            pagination=EquipmentPagination(total=0, page=query.page, limit=query.limit, totalPages=0),
        )


def test_equipment_requires_session():
    client = TestClient(create_app(equipment_service=FakeEquipmentService()))

    response = client.get("/api/equipment")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_equipment_passes_query_params_to_service():
    settings = Settings(session_secret="test-secret")
    service = FakeEquipmentService()
    client = TestClient(create_app(settings=settings, equipment_service=service))
    user = CurrentUser(
        user_id="admin",
        name="Administrator",
        corp_id="HCT",
        corp_name="HCT",
        role="MASTER",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))

    response = client.get(
        "/api/equipment?page=2&limit=50&sortBy=hctNo&order=asc&serialNumber=SN-1"
    )

    assert response.status_code == 200
    assert response.json()["pagination"] == {
        "total": 0,
        "page": 2,
        "limit": 50,
        "totalPages": 0,
    }
    assert service.query.page == 2
    assert service.query.limit == 50
    assert service.query.sortBy == "hctNo"
    assert service.query.order == "asc"
    assert service.query.serialNumber == "SN-1"
