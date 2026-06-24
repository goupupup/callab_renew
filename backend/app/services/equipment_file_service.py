from dataclasses import dataclass
from typing import Optional


@dataclass
class FileResult:
    content: bytes
    filename: str
    media_type: str


class EquipmentFileService:
    def get_download(
        self,
        user,
        equipment_id: str,
        file_type: str,
        cal_no: Optional[str] = None,
    ) -> Optional[FileResult]:
        return None

    def upload(self, user, equipment_id: str, filename: str, content: bytes):
        return {
            "success": False,
            "message": "FTP upload is not configured",
        }
