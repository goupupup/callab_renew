from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser
from app.schemas.equipment import (
    CertDownloadItem,
    CertDownloadSearchResponse,
    EquipmentListResponse,
    EquipmentPagination,
)
from app.services.equipment_file_service import FileResult


class FakeEquipmentService:
    def __init__(self):
        self.query = None
        self.cert_query = None

    def search(self, user: CurrentUser, query):
        self.query = query
        return EquipmentListResponse(
            data=[],
            pagination=EquipmentPagination(total=0, page=query.page, limit=query.limit, totalPages=0),
        )

    def search_cert_downloads(self, user: CurrentUser, query):
        self.cert_query = query
        return CertDownloadSearchResponse(
            data=[
                CertDownloadItem(
                    ISID="1001",
                    CIDU="CAL2024001",
                    NAEM_SUP="Equipment",
                    CAL_DATE="20240102",
                    RETURN_DATE="20240103",
                )
            ],
            total=1,
            limit=query.limit,
        )


class FakeBulkFileService:
    def __init__(self):
        self.bulk_call = None

    def is_configured(self):
        return True

    def get_bulk_download(self, user: CurrentUser, file_type: str, items):
        self.bulk_call = (user, file_type, items)
        return FileResult(
            content=b"zip-content",
            filename="bulk.zip",
            media_type="application/zip",
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
        "&returnDateStart=2024-01-01&returnDateEnd=2024-01-31"
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
    assert service.query.returnDateStart == "2024-01-01"
    assert service.query.returnDateEnd == "2024-01-31"


def test_cert_download_search_passes_query_params_to_service():
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
        "/api/equipment/cert-download/search?calDateStart=2024-01-01&returnDateEnd=2024-01-31&limit=100"
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert service.cert_query.calDateStart == "2024-01-01"
    assert service.cert_query.returnDateEnd == "2024-01-31"
    assert service.cert_query.limit == 100


def test_cert_download_bulk_returns_zip_file():
    settings = Settings(session_secret="test-secret")
    equipment_service = FakeEquipmentService()
    file_service = FakeBulkFileService()
    client = TestClient(
        create_app(
            settings=settings,
            equipment_service=equipment_service,
            file_service=file_service,
        )
    )
    user = CurrentUser(
        user_id="admin",
        name="Administrator",
        corp_id="HCT",
        corp_name="HCT",
        role="MASTER",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))

    response = client.get("/api/equipment/cert-download/bulk?type=report&calDateStart=2024-01-01")

    assert response.status_code == 200
    assert response.content == b"zip-content"
    assert response.headers["content-type"] == "application/zip"
    assert "bulk.zip" in response.headers["content-disposition"]
    assert file_service.bulk_call[1] == "report"
    assert file_service.bulk_call[2][0].CIDU == "CAL2024001"


def test_cert_download_bulk_post_uses_selected_rows_only():
    settings = Settings(session_secret="test-secret")
    file_service = FakeBulkFileService()
    client = TestClient(create_app(settings=settings, file_service=file_service))
    user = CurrentUser(
        user_id="admin",
        name="Administrator",
        corp_id="HCT",
        corp_name="HCT",
        role="MASTER",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))

    response = client.post(
        "/api/equipment/cert-download/bulk",
        json={
            "type": "data",
            "items": [
                {"ISID": "1001", "CIDU": "CAL2024001"},
                {"ISID": "1002", "CIDU": "CAL2024002"},
            ],
        },
    )

    assert response.status_code == 200
    assert response.content == b"zip-content"
    assert file_service.bulk_call[1] == "data"
    assert [item.ISID for item in file_service.bulk_call[2]] == ["1001", "1002"]


def test_cert_download_bulk_post_rejects_more_than_200_rows():
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, file_service=FakeBulkFileService()))
    user = CurrentUser(
        user_id="admin",
        name="Administrator",
        corp_id="HCT",
        corp_name="HCT",
        role="MASTER",
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))

    response = client.post(
        "/api/equipment/cert-download/bulk",
        json={
            "type": "report",
            "items": [{"ISID": str(index), "CIDU": f"CAL{index}"} for index in range(201)],
        },
    )

    assert response.status_code == 422
