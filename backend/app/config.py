"""
Application configuration management using pydantic-settings.
Reads environment variables or a local .env file safely without hardcoded secrets.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings model.
    Values can be overridden by environment variables or values in backend/.env.
    """
    APP_NAME: str = "Pramana-Backend"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database Configuration (PostgreSQL)
    # Default is a placeholder format; overridden by local .env or AWS SSM in production
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/pramana_db"

    # Security configuration
    SECRET_KEY: str = "insecure_dev_secret_key_change_in_env_file"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, ge=1, le=1440)

    # AWS Configuration placeholders (coordinated with Person 3)
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str = "pramana-kyc-documents-bucket"
    SES_SENDER_EMAIL: str = "noreply@pramana.example.com"

    # Verification Engine thresholds
    SIMILARITY_THRESHOLD_NAME: float = 85.0
    SIMILARITY_THRESHOLD_ADDRESS: float = 80.0

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached instance of Settings so the environment is read once.
    """
    return Settings()
