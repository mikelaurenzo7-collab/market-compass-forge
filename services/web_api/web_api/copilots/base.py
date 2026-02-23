"""LLM provider abstraction - supports cloud and on-prem/VPC deployments."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


class LLMProvider(str, Enum):
    """Supported LLM backends."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE_OPENAI = "azure_openai"
    ONPREM = "onprem"  # Self-hosted / VPC deployment


@dataclass
class CopilotConfig:
    """Configuration for LLM copilot - supports on-prem/VPC."""
    provider: LLMProvider = LLMProvider.OPENAI
    model: str = "gpt-4o-mini"
    api_key: str | None = None
    base_url: str | None = None  # For Azure/on-prem: custom endpoint
    vpc_mode: bool = False  # If True, use base_url and never call public APIs


class LLMClient(ABC):
    """Abstract LLM client for copilot operations."""

    @abstractmethod
    def complete(self, prompt: str, max_tokens: int = 2048) -> str:
        pass


def get_llm_client(config: CopilotConfig) -> LLMClient:
    """Factory for LLM client based on config."""
    if config.provider == LLMProvider.ONPREM and config.base_url:
        from web_api.copilots.openai_compat import OpenAICompatClient
        return OpenAICompatClient(base_url=config.base_url, api_key=config.api_key or "dummy", model=config.model)
    if config.provider == LLMProvider.OPENAI:
        from web_api.copilots.openai_compat import OpenAICompatClient
        return OpenAICompatClient(base_url="https://api.openai.com/v1", api_key=config.api_key or "", model=config.model)
    if config.provider == LLMProvider.ANTHROPIC:
        from web_api.copilots.anthropic_client import AnthropicClient
        return AnthropicClient(api_key=config.api_key or "", model=config.model)
    from web_api.copilots.openai_compat import OpenAICompatClient
    return OpenAICompatClient(base_url=config.base_url or "https://api.openai.com/v1", api_key=config.api_key or "dummy", model=config.model)
