from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Default config settings for the application
    app_name: str = "PracticeLab API"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./data/practicelab.db"
    cors_origins: str = "http://localhost:5173"

    # Overide config settings from environment variables or .env file
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
