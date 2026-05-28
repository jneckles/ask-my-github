"""Prompt construction for grounded README answers."""

SYSTEM_PROMPT = (
    "You are an assistant that answers questions about a developer's GitHub "
    "projects. You will be given context chunks from their README files and a "
    "question. Answer ONLY using information present in the context. If the "
    'answer is not in the context, respond with exactly: "I don\'t know based '
    'on your READMEs." Do not speculate, do not use outside knowledge, do not '
    "apologize. When you do answer, be concrete and reference what the READMEs say."
)


def build_user_message(question: str, chunks: list[dict]) -> str:
    context_blocks = []
    for number, chunk in enumerate(chunks, start=1):
        context_blocks.append(
            f"Source: {chunk['source']}\nChunk {number}:\n{chunk['text']}"
        )

    context = "\n\n---\n\n".join(context_blocks)
    return f"Context:\n{context}\n\nQuestion:\n{question}"
