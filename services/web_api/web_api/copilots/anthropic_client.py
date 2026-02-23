"""Anthropic Claude client - optional dependency."""

from web_api.copilots.base import LLMClient


class AnthropicClient(LLMClient):
    """Anthropic Claude API client."""

    def __init__(self, api_key: str, model: str = "claude-3-haiku-20240307"):
        self.api_key = api_key
        self.model = model

    def complete(self, prompt: str, max_tokens: int = 2048) -> str:
        try:
            import httpx
            r = httpx.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={"model": self.model, "max_tokens": max_tokens, "messages": [{"role": "user", "content": prompt}]},
                timeout=60,
            )
            r.raise_for_status()
            data = r.json()
            return data.get("content", [{}])[0].get("text", "")
        except Exception as e:
            return f"[LLM Error: {e}]"
