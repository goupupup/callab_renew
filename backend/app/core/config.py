from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
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
        env_file=".env",
        env_prefix="CALLAB_",
        extra="ignore",
    )

    @model_validator(mode="after")
    def apply_legacy_oracle_env_fallbacks(self):
        import os

        if not self.oracle_user:
            self.oracle_user = os.getenv("ORACLE_USER", "")
        if not self.oracle_password:
            self.oracle_password = os.getenv("ORACLE_PASS", "")
        if not self.oracle_dsn:
            self.oracle_dsn = os.getenv("ORACLE_CONN_STR", "")
        if not self.oracle_lib_dir:
            self.oracle_lib_dir = os.getenv("ORACLE_LIB_DIR", "")
        if not self.ftp_host:
            self.ftp_host = os.getenv("FTP_HOST", "")
        if not self.ftp_user:
            self.ftp_user = os.getenv("FTP_USER", "")
        if not self.ftp_password:
            self.ftp_password = os.getenv("FTP_PASSWORD", "")
        return self
