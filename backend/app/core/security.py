import base64
import hashlib
import hmac
import json
from typing import Optional

from fastapi import HTTPException, Request, status

from app.core.config import Settings
from app.schemas.auth import CurrentUser


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


def create_session_token(user: CurrentUser, settings: Settings) -> str:
    payload_json = user.model_dump_json()
    payload = _b64encode(payload_json.encode("utf-8"))
    signature = _sign(payload, settings.session_secret)
    return f"{payload}.{signature}"


def parse_session_token(token: str, settings: Settings) -> Optional[CurrentUser]:
    try:
        payload, signature = token.split(".", 1)
    except ValueError:
        return None

    expected_signature = _sign(payload, settings.session_secret)
    if not hmac.compare_digest(signature, expected_signature):
        return None

    try:
        payload_json = base64.urlsafe_b64decode(_pad_b64(payload)).decode("utf-8")
        return CurrentUser(**json.loads(payload_json))
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def current_user_from_request(request: Request) -> CurrentUser:
    settings: Settings = request.app.state.settings
    token = request.cookies.get(settings.session_cookie_name)
    user = parse_session_token(token or "", settings)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user


def _sign(payload: str, secret: str) -> str:
    digest = hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return _b64encode(digest)


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _pad_b64(value: str) -> bytes:
    return (value + "=" * (-len(value) % 4)).encode("ascii")
