from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Trade Review System API"
    environment: str = "development"
    database_url: str = "sqlite:///./trade_review.db"
    backend_cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    upload_dir: str = "uploads"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
