from typing import Optional

from app.core.security import map_legacy_role
from app.schemas.auth import CurrentUser


class AuthService:
    def __init__(self, auth_repository):
        self.auth_repository = auth_repository

    def authenticate(self, username: str, password: str) -> Optional[CurrentUser]:
        user_row = self.auth_repository.find_active_user_by_id(username.strip())
        if not user_row:
            return None

        db_password = _clean(user_row.get("PASSWORD"))
        input_password = password.strip()
        if db_password != input_password:
            return None

        return CurrentUser(
            user_id=_clean(user_row.get("USERID")) or username.strip(),
            name=_clean(user_row.get("USERNAME")) or "Member",
            corp_id=_clean(user_row.get("CORPID")) or "NONE",
            corp_name=_clean(user_row.get("CORPNAME")) or "",
            role=map_legacy_role(
                authority=_clean(user_row.get("AUTHORITY")),
                corp_type=_clean(user_row.get("CORPTYPE")),
            ),
        )


def _clean(value) -> str:
    return str(value).strip() if value is not None else ""
