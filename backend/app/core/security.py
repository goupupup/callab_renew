from typing import Optional

from fastapi import HTTPException, status


def map_legacy_role(authority: Optional[str], corp_type: Optional[str]) -> str:
    normalized_authority = (authority or "").strip().upper()
    normalized_corp_type = (corp_type or "").strip().upper()

    if normalized_corp_type == "H" and normalized_authority == "A":
        return "MASTER"
    if normalized_corp_type == "H" and normalized_authority == "U":
        return "EMPLOYEE"
    return "USER"


def require_current_user():
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )
