from pydantic_settings import BaseSettings, SettingsConfigDict


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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="CALLAB_",
        extra="ignore",
    )
