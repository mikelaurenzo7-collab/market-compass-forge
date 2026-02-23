"""LLM copilots for deal memo drafting and Q&A over documents. Supports on-prem/VPC."""

from web_api.copilots.base import LLMProvider, CopilotConfig
from web_api.copilots.deal_memo import draft_deal_memo
from web_api.copilots.qa import answer_question_over_docs

__all__ = [
    "LLMProvider",
    "CopilotConfig",
    "draft_deal_memo",
    "answer_question_over_docs",
]
