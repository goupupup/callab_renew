from app.core.config import Settings


def test_settings_use_safe_defaults_for_local_development():
    settings = Settings()

    assert settings.app_name == "CALLAB Backend"
    assert settings.api_prefix == "/api"
    assert settings.oracle_thick_mode is True


def test_settings_support_legacy_oracle_environment_names(monkeypatch):
    monkeypatch.setenv("ORACLE_USER", "legacy_user")
    monkeypatch.setenv("ORACLE_PASS", "legacy_password")
    monkeypatch.setenv("ORACLE_CONN_STR", "legacy_dsn")
    monkeypatch.setenv("ORACLE_LIB_DIR", "/opt/oracle")

    settings = Settings()

    assert settings.oracle_user == "legacy_user"
    assert settings.oracle_password == "legacy_password"
    assert settings.oracle_dsn == "legacy_dsn"
    assert settings.oracle_lib_dir == "/opt/oracle"
