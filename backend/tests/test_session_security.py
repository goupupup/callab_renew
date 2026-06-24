from app.core.config import Settings
from app.core.security import create_session_token, parse_session_token
from app.schemas.auth import CurrentUser


def test_signed_session_token_round_trips_user_data():
    settings = Settings(session_secret="test-secret")
    user = CurrentUser(
        user_id="admin",
        name="Administrator",
        corp_id="HCT",
        corp_name="HCT",
        role="MASTER",
    )

    token = create_session_token(user, settings)

    assert parse_session_token(token, settings) == user


def test_tampered_session_token_is_rejected():
    settings = Settings(session_secret="test-secret")
    user = CurrentUser(
        user_id="admin",
        name="Administrator",
        corp_id="HCT",
        corp_name="HCT",
        role="MASTER",
    )
    token = create_session_token(user, settings)

    assert parse_session_token(token + "tampered", settings) is None
