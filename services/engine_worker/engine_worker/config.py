from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://grapevine:grapevine@localhost:5432/grapevine_engine"
    celery_broker_url: str = "redis://localhost:6379/1"


settings = Settings()
