from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://grapevine:grapevine@localhost:5432/grapevine_web"
    engine_api_url: str = "http://localhost:8001"
    secret_key: str = "dev-secret-key"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"


settings = Settings()
