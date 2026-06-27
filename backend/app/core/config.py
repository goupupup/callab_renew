from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    default_oracle_dsn: str = (
        "(DESCRIPTION=(TRANSPORT_CONNECT_TIMEOUT=5)(CONNECT_TIMEOUT=10)(RETRY_COUNT=0)"
        "(ADDRESS=(PROTOCOL=TCP)(HOST=172.20.25.2)(PORT=1521))"
        "(CONNECT_DATA=(SID=XE)))"
    )
    app_name: str = "CALLAB Backend"
    api_prefix: str = "/api"
    oracle_user: str = ""
    oracle_password: str = ""
    oracle_dsn: str = ""
    oracle_lib_dir: str = ""
    oracle_thick_mode: bool = True
    ftp_host: str = ""
    ftp_user: str = ""
    ftp_password: str = ""
    session_secret: str = "change-me-in-production"
    session_cookie_name: str = "callab_session"
    session_max_age_seconds: int = 60 * 60 * 8
    cors_origins: str = "http://127.0.0.1:3000,http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_prefix="CALLAB_",
        extra="ignore",
    )

    @model_validator(mode="after")
    def apply_legacy_oracle_env_fallbacks(self):
        import os
        from dotenv import dotenv_values

        legacy_env = {}
        for env_path in (".env", "backend/.env"):
            legacy_env.update({key: value for key, value in dotenv_values(env_path).items() if value})

        def legacy_value(key: str) -> str:
            return os.getenv(key) or legacy_env.get(key, "")

        if not self.oracle_user:
            self.oracle_user = legacy_value("ORACLE_USER")
        if not self.oracle_password:
            self.oracle_password = legacy_value("ORACLE_PASS")
        if not self.oracle_dsn:
            self.oracle_dsn = legacy_value("ORACLE_CONN_STR")
        if not self.oracle_dsn:
            self.oracle_dsn = self.default_oracle_dsn
        if not self.oracle_lib_dir:
            self.oracle_lib_dir = legacy_value("ORACLE_LIB_DIR")
        if not self.ftp_host:
            self.ftp_host = legacy_value("FTP_HOST")
        if not self.ftp_user:
            self.ftp_user = legacy_value("FTP_USER")
        if not self.ftp_password:
            self.ftp_password = legacy_value("FTP_PASSWORD")
        return self
