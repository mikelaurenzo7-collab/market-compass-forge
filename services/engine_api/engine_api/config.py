from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://grapevine:grapevine@localhost:5432/grapevine_engine"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    simulation_chunk_size: int = 20000
    env: str = "dev"
    rate_limit_simulations: int = 10
    rate_limit_benchmarks: int = 2


settings = Settings()
