from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "topup.com"

    database_url: str

    supplier_api_url: str = ""
    supplier_api_key: str = ""
    supplier_api_secret: str = ""
    supplier_live_mode: bool = False
   
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"

    google_client_id: str = ""

    frontend_url: str = "http://127.0.0.1:8000"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        extra="ignore",
    )


settings = Settings()

