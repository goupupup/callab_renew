from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser
from app.schemas.equipment import (
    EquipmentItem,
    EquipmentListResponse,
    EquipmentPagination,
)


class FakeEquipmentService:
    def __init__(self):
        self.query = None

    def search(self, user: CurrentUser, query):
        self.query = query
        return EquipmentListResponse(
            data=[
                EquipmentItem(
                    ISID="1001",
                    ACCN="A-1",
                    NAEM_SUP="Equipment",
                    MODL="Model",
                    SERN="SN",
                    LAST="20250101",
                    NEXT="20260101",
                )
            ],
            pagination=EquipmentPagination(total=1, page=1, limit=query.limit, totalPages=1),
        )


def test_equipment_export_requires_session():
    client = TestClient(create_app(equipment_service=FakeEquipmentService()))

    response = client.get("/api/equipment/export")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_equipment_export_returns_xlsx_file_and_forces_all_rows():
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

    response = client.get("/api/equipment/export?sortBy=hctNo&order=asc")

    assert response.status_code == 200
    assert response.headers["content-type"] == (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert "Equipment_Export_" in response.headers["content-disposition"]
    assert response.content.startswith(b"PK")
    assert service.query.limit == 9999
