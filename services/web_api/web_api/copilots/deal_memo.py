"""Deal memo drafting copilot - generates structured deal memos from deal + document context."""

from web_api.copilots.base import CopilotConfig, get_llm_client


def draft_deal_memo(
    deal_name: str,
    deal_context: dict,
    document_summaries: list[str],
    config: CopilotConfig | None = None,
) -> str:
    """Draft a deal memo section from deal data and document context."""
    config = config or CopilotConfig()
    ctx_str = "\n".join(f"- {k}: {v}" for k, v in deal_context.items())
    doc_str = "\n".join(document_summaries[:5]) if document_summaries else "No documents provided."
    prompt = f"""You are a PE analyst. Draft a concise deal memo executive summary for:

Deal: {deal_name}
Deal context:
{ctx_str}

Relevant document excerpts:
{doc_str}

Output a professional 2-4 paragraph deal memo summary. Do not include legal advice or guarantees."""
    client = get_llm_client(config)
    return client.complete(prompt, max_tokens=1024)
