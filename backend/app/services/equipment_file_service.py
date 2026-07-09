from dataclasses import dataclass
from datetime import datetime
from ftplib import FTP, error_perm
from io import BytesIO
from pathlib import PurePosixPath
from typing import Optional
from zipfile import ZIP_DEFLATED, ZipFile


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
        if not self.is_configured() or self.equipment_repository is None:
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
        media_type = "application/pdf" if file_type == "report" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if file_type == "excel" else "application/octet-stream"
        return FileResult(content=content, filename=filename, media_type=media_type)

    def get_bulk_download(self, user, file_type: str, items) -> FileResult:
        if file_type not in ("report", "data"):
            raise ValueError("Unsupported file type")

        archive = BytesIO()
        summary = []
        used_names = set()
        success_count = 0
        missing_count = 0
        folder = "certificates" if file_type == "report" else "data-files"

        with ZipFile(archive, "w", ZIP_DEFLATED) as zip_file:
            for item in items:
                equipment_id = _row_value(item, "ISID")
                cal_no = _row_value(item, "CIDU")
                if not equipment_id:
                    continue

                result = self.get_download(user, equipment_id, file_type, cal_no)
                if result is None:
                    missing_count += 1
                    summary.append(f"MISS\t{equipment_id}\t{cal_no or '-'}\tFile not found")
                    continue

                success_count += 1
                archive_name = _unique_zip_name(
                    used_names,
                    f"{folder}/{result.filename}",
                )
                zip_file.writestr(archive_name, result.content)
                summary.append(f"OK\t{equipment_id}\t{cal_no or '-'}\t{archive_name}")

            header = [
                "CALLAB bulk download summary",
                f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC",
                f"Type: {file_type}",
                f"Success: {success_count}",
                f"Missing: {missing_count}",
                "",
                "STATUS\tREG_NO\tCAL_NO\tDETAIL",
            ]
            zip_file.writestr("download-summary.txt", "\n".join(header + summary) + "\n")

        filename_type = "Certificates" if file_type == "report" else "Data_Files"
        filename = f"CALLAB_Bulk_{filename_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
        return FileResult(
            content=archive.getvalue(),
            filename=filename,
            media_type="application/zip",
        )

    def upload(self, user, equipment_id: str, filename: str, content: bytes):
        if not self.is_configured():
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

    def is_configured(self) -> bool:
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

    if file_type == "excel" and cal_no:
        return [
            f"/report/report_hct/{year}/{cal_no}.xlsx",
            f"/report/report_hct/{year}/{cal_no}.XLSX",
            f"/report/report_hct/{cal_no}.xlsx",
            f"/report/report_hct/{cal_no}.XLSX",
        ]

    return []


def build_download_filename(
    equipment_id: str,
    asset_no: str,
    cal_no: str,
    remote_path: str,
    file_type: str,
):
    extension = _extension(remote_path) or ("pdf" if file_type == "report" else "xlsx")
    safe_asset_no = _filename_part(asset_no or equipment_id)
    safe_cal_no = _filename_part(cal_no or "latest")
    safe_equipment_id = _filename_part(equipment_id)
    return f"{safe_asset_no}_{safe_cal_no} ({safe_equipment_id}).{extension}"


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


def _filename_part(value: str) -> str:
    text = str(value or "").strip()
    return "".join(char if char not in '\\/:*?"<>|' else "_" for char in text) or "-"


def _row_value(row, key: str) -> str:
    if hasattr(row, key):
        return str(getattr(row, key) or "").strip()
    if isinstance(row, dict):
        return str(row.get(key) or "").strip()
    return ""


def _unique_zip_name(used_names, name: str) -> str:
    if name not in used_names:
        used_names.add(name)
        return name

    path = PurePosixPath(name)
    stem = path.stem
    suffix = path.suffix
    parent = str(path.parent)
    index = 2
    while True:
        candidate = f"{parent}/{stem}_{index}{suffix}"
        if candidate not in used_names:
            used_names.add(candidate)
            return candidate
        index += 1


def _year_from_cal_no(cal_no: str) -> str:
    for index in range(max(len(cal_no) - 3, 0)):
        candidate = cal_no[index : index + 4]
        if candidate.isdigit():
            return candidate
    if len(cal_no) >= 2 and cal_no[:2].isdigit():
        return f"20{cal_no[:2]}"
    from datetime import datetime

    return str(datetime.now().year)
