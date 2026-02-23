"""OpenAI-compatible client - works with OpenAI, Azure OpenAI, and on-prem/VPC deployments."""

import os
from web_api.copilots.base import LLMClient


class OpenAICompatClient(LLMClient):
    """Uses OpenAI API format - compatible with Azure OpenAI and local LLM servers."""

    def __init__(self, base_url: str, api_key: str, model: str = "gpt-4o-mini"):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model

    def complete(self, prompt: str, max_tokens: int = 2048) -> str:
        try:
            import httpx
            r = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={"model": self.model, "messages": [{"role": "user", "content": prompt}], "max_tokens": max_tokens},
                timeout=60,
            )
            r.raise_for_status()
            data = r.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except Exception as e:
            return f"[LLM Error: {e}]"
