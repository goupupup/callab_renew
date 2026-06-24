from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_session_token
from app.main import create_app
from app.schemas.auth import CurrentUser
from app.services.equipment_file_service import (
    EquipmentFileService,
    FileResult,
    build_candidate_paths,
    build_download_filename,
)


class FakeFileService:
    def __init__(self):
        self.download_call = None
        self.upload_call = None

    def get_download(self, user: CurrentUser, equipment_id: str, file_type: str, cal_no=None):
        self.download_call = (user, equipment_id, file_type, cal_no)
        return FileResult(
            content=b"file-content",
            filename="report.pdf",
            media_type="application/pdf",
        )

    def upload(self, user: CurrentUser, equipment_id: str, filename: str, content: bytes):
        self.upload_call = (user, equipment_id, filename, content)
        return {"success": True, "path": "/HCT_CALLAB/gear/1001.xlsx"}


def _client_with_user(role: str, file_service: FakeFileService):
    settings = Settings(session_secret="test-secret")
    client = TestClient(create_app(settings=settings, file_service=file_service))
    user = CurrentUser(
        user_id="user",
        name="User",
        corp_id="C001" if role == "USER" else "HCT",
        corp_name="Corp",
        role=role,
    )
    client.cookies.set(settings.session_cookie_name, create_session_token(user, settings))
    return client


def test_equipment_download_requires_session():
    client = TestClient(create_app(file_service=FakeFileService()))

    response = client.get("/api/equipment/download?id=1001&type=report")

    assert response.status_code == 401


def test_equipment_download_streams_file_for_authenticated_user():
    file_service = FakeFileService()
    client = _client_with_user("USER", file_service)

    response = client.get("/api/equipment/download?id=1001&type=report&calno=CAL1")

    assert response.status_code == 200
    assert response.content == b"file-content"
    assert response.headers["content-type"] == "application/pdf"
    assert "report.pdf" in response.headers["content-disposition"]
    assert file_service.download_call[1:] == ("1001", "report", "CAL1")


def test_equipment_upload_forbids_customer_user():
    client = _client_with_user("USER", FakeFileService())

    response = client.post(
        "/api/equipment/upload",
        data={"id": "1001"},
        files={"file": ("data.xlsx", b"content")},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Elevated role required"}


def test_equipment_upload_accepts_employee_user():
    file_service = FakeFileService()
    client = _client_with_user("EMPLOYEE", file_service)

    response = client.post(
        "/api/equipment/upload",
        data={"id": "1001"},
        files={"file": ("data.xlsx", b"content")},
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert file_service.upload_call[1:] == ("1001", "data.xlsx", b"content")


def test_file_service_returns_not_configured_when_ftp_settings_are_missing():
    service = EquipmentFileService(settings=Settings(), equipment_repository=None)

    assert service.get_download(CurrentUser(user_id="u", name="U", corp_id="C", corp_name="C", role="MASTER"), "1001", "data") is None
    assert service.upload(None, "1001", "data.xlsx", b"content") == {
        "success": False,
        "message": "FTP upload is not configured",
    }


def test_report_candidate_paths_follow_legacy_ftp_layout():
    paths = build_candidate_paths("1001", "ASSET1", "CAL2024001", "report")

    assert paths[:3] == [
        "/report/report_cust_pdf/2024/CAL2024001.pdf",
        "/report/report_cust_pdf/2024/CAL2024001.PDF",
        "/report/report_cust_pdf/CAL2024001.pdf",
    ]
    assert "/HCT_CALLAB/gear/CAL2024001.pdf" in paths


def test_data_download_filename_uses_actual_remote_extension():
    filename = build_download_filename(
        "1001",
        "ASSET1",
        "CAL2024001",
        "/HCT_CALLAB/gear/1001.zip",
        "data",
    )

    assert filename == "ASSET1 - 2024_CAL2024001_1001.zip"
