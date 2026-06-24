from app.core.config import Settings


def test_settings_use_safe_defaults_for_local_development():
    settings = Settings()

    assert settings.app_name == "CALLAB Backend"
    assert settings.api_prefix == "/api"
    assert settings.oracle_thick_mode is True
