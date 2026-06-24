from dataclasses import dataclass
from ftplib import FTP, error_perm
from io import BytesIO
from pathlib import PurePosixPath
from typing import Optional


@dataclass
class FileResult:
    content: bytes
    filename: str
    media_type: str


class EquipmentFileService:
    def __init__(self, settings=None, equipment_repository=None, ftp_factory=FTP):
        self.settings = settings
        self.equipment_repository = equipment_repository
        self.ftp_factory = ftp_factory

    def get_download(
        self,
        user,
        equipment_id: str,
        file_type: str,
        cal_no: Optional[str] = None,
    ) -> Optional[FileResult]:
        if not self._is_configured() or self.equipment_repository is None:
            return None

        context = self.equipment_repository.get_file_context(
            corp_id=user.corp_id,
            is_elevated=user.role in ("MASTER", "EMPLOYEE"),
            equipment_id=equipment_id,
            cal_no=cal_no or "",
        )
        if context is None:
            return None

        asset_no = context.get("ACCN") or equipment_id
        resolved_cal_no = context.get("CIDU") or ""
        paths = build_candidate_paths(equipment_id, asset_no, resolved_cal_no, file_type)
        downloaded = self._download_first_available(paths)
        if downloaded is None:
            return None

        remote_path, content = downloaded
        filename = build_download_filename(equipment_id, asset_no, resolved_cal_no, remote_path, file_type)
        media_type = "application/pdf" if file_type == "report" else "application/octet-stream"
        return FileResult(content=content, filename=filename, media_type=media_type)

    def upload(self, user, equipment_id: str, filename: str, content: bytes):
        if not self._is_configured():
            return {
                "success": False,
                "message": "FTP upload is not configured",
            }

        extension = _extension(filename) or "xlsx"
        target_path = f"/HCT_CALLAB/gear/{equipment_id.strip()}.{extension}"
        with self._connect() as ftp:
            _ensure_remote_dirs(ftp, str(PurePosixPath(target_path).parent))
            ftp.storbinary(f"STOR {target_path}", BytesIO(content))

        return {
            "success": True,
            "message": "File uploaded successfully",
            "path": target_path,
        }

    def _is_configured(self) -> bool:
        return bool(
            self.settings
            and self.settings.ftp_host
            and self.settings.ftp_user
            and self.settings.ftp_password
        )

    def _connect(self):
        ftp = self.ftp_factory(self.settings.ftp_host)
        ftp.login(self.settings.ftp_user, self.settings.ftp_password)
        return ftp

    def _download_first_available(self, paths):
        with self._connect() as ftp:
            for path in paths:
                buffer = BytesIO()
                try:
                    ftp.retrbinary(f"RETR {path}", buffer.write)
                except error_perm:
                    continue
                return path, buffer.getvalue()
        return None


def build_candidate_paths(equipment_id: str, asset_no: str, cal_no: str, file_type: str):
    year = _year_from_cal_no(cal_no)
    if file_type == "data":
        extensions = ["xlsx", "XLSX", "zip", "ZIP", "txt", "PDF", "pdf"]
        paths = [f"/HCT_CALLAB/gear/{equipment_id}.{extension}" for extension in extensions]
        if asset_no and asset_no != equipment_id:
            paths.extend(f"/HCT_CALLAB/gear/{asset_no}.{extension}" for extension in extensions)
        paths.append(f"/HCT_CALLAB/{equipment_id}.xlsx")
        return paths

    if file_type == "report" and cal_no:
        return [
            f"/report/report_cust_pdf/{year}/{cal_no}.pdf",
            f"/report/report_cust_pdf/{year}/{cal_no}.PDF",
            f"/report/report_cust_pdf/{cal_no}.pdf",
            f"/HCT_CALLAB/report/{cal_no}.pdf",
            f"/HCT_CALLAB/report/{equipment_id}.pdf",
            f"/report/report_rawdata/{year}/{cal_no}.pdf",
            f"/HCT_CALLAB/gear/{equipment_id}.pdf",
            f"/HCT_CALLAB/gear/{cal_no}.pdf",
        ]

    return []


def build_download_filename(
    equipment_id: str,
    asset_no: str,
    cal_no: str,
    remote_path: str,
    file_type: str,
):
    if file_type == "report":
        return PurePosixPath(remote_path).name

    year = _year_from_cal_no(cal_no)
    extension = _extension(remote_path) or "xlsx"
    return f"{asset_no} - {year}_{cal_no}_{equipment_id}.{extension}"


def _ensure_remote_dirs(ftp, directory: str):
    parts = [part for part in directory.split("/") if part]
    for part in parts:
        try:
            ftp.cwd(part)
        except error_perm:
            ftp.mkd(part)
            ftp.cwd(part)
    ftp.cwd("/")


def _extension(filename: str) -> str:
    suffix = PurePosixPath(filename).suffix
    return suffix[1:] if suffix.startswith(".") else suffix


def _year_from_cal_no(cal_no: str) -> str:
    for index in range(max(len(cal_no) - 3, 0)):
        candidate = cal_no[index : index + 4]
        if candidate.isdigit():
            return candidate
    if len(cal_no) >= 2 and cal_no[:2].isdigit():
        return f"20{cal_no[:2]}"
    from datetime import datetime

    return str(datetime.now().year)
