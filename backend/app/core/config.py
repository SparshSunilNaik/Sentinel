from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Sentinel Governance Control Plane"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    secret_key: str = "sentinel-amex-codestreet-2026-dev-secret-change-in-prod"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    database_url: str = "sqlite:///./sentinel.db"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    default_operator_email: str = "operator@amex.com"
    default_operator_password: str = "sentinel2026"
    default_operator_name: str = "Sentinel Operator"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
