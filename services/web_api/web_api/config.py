from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://grapevine:grapevine@localhost:5432/grapevine_web"
    engine_api_url: str = "http://localhost:8001"
    secret_key: str = "dev-secret-key"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # LLM copilot - on-prem/VPC: set LLM_BASE_URL to your self-hosted endpoint
    llm_provider: str = "openai"
    llm_api_key: str = ""
    llm_base_url: str = ""  # For Azure/on-prem deployments
    llm_model: str = "gpt-4o-mini"

    # SOC2 / compliance
    audit_retention_days: int = 365
    sso_enabled: bool = False
    encryption_at_rest: bool = False  # Placeholder - enable when using encrypted storage


settings = Settings()
