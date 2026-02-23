"""Q&A over documents copilot - answers questions using document context."""

from web_api.copilots.base import CopilotConfig, get_llm_client


def answer_question_over_docs(
    question: str,
    document_chunks: list[str],
    config: CopilotConfig | None = None,
) -> str:
    """Answer a question using provided document chunks as context."""
    config = config or CopilotConfig()
    context = "\n\n---\n\n".join(document_chunks[:10]) if document_chunks else "No documents available."
    prompt = f"""Answer the following question based only on the provided document excerpts. If the answer is not in the documents, say so.

Documents:
{context}

Question: {question}

Answer:"""
    client = get_llm_client(config)
    return client.complete(prompt, max_tokens=1024)
