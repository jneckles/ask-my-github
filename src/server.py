"""FastAPI server for ask-my-github."""

from __future__ import annotations

import os
import json
import re
import time
from collections import Counter
from pathlib import Path

from anthropic import Anthropic, AnthropicError
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.prompt import SYSTEM_PROMPT, build_user_message

DEFAULT_MODEL = "claude-sonnet-4-6"
REFUSAL_TEXT = "I don't know based on your READMEs."
INDEX_PATH = Path("data/index.json")
TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9_-]*")

load_dotenv()

app = FastAPI(title="ask-my-github API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=os.getenv(
        "ASK_MY_GITHUB_CORS_ORIGIN_REGEX",
        r"^https?://(localhost|127\.0\.0\.1):\d+$",
    ),
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

_index_cache: list[dict] | None = None


class AskRequest(BaseModel):
    question: str = Field(min_length=1)
    topK: int = Field(default=4, ge=1, le=10)


class SourceCitation(BaseModel):
    filePath: str
    score: float
    snippet: str


class AskResponse(BaseModel):
    answer: str
    refused: bool
    refusalReason: str | None = None
    sources: list[SourceCitation]
    latencyMs: int


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest) -> AskResponse:
    started = time.perf_counter()

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Missing ANTHROPIC_API_KEY. Add it to .env or your shell.",
        )

    index = get_index()
    chunks = top_k_lexical(request.question, index, k=request.topK)

    client = Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", DEFAULT_MODEL),
            max_tokens=700,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": build_user_message(request.question, chunks)}
            ],
        )
    except AnthropicError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    answer = response.content[0].text.strip()
    refused = answer == REFUSAL_TEXT
    latency_ms = int((time.perf_counter() - started) * 1000)

    return AskResponse(
        answer="" if refused else answer,
        refused=refused,
        refusalReason="No supporting context found in the indexed READMEs."
        if refused
        else None,
        sources=[] if refused else [to_source_citation(chunk) for chunk in chunks],
        latencyMs=latency_ms,
    )


def get_index() -> list[dict]:
    global _index_cache

    if _index_cache is None:
        if not INDEX_PATH.exists():
            raise HTTPException(
                status_code=503,
                detail="Missing data/index.json. Run `python -m src.ingest` first.",
            )
        _index_cache = json.loads(INDEX_PATH.read_text(encoding="utf-8"))

    return _index_cache


def top_k_lexical(question: str, index: list[dict], k: int) -> list[dict]:
    query_terms = tokenize(question)
    if not query_terms:
        return []

    query_counts = Counter(query_terms)
    scored = []
    for item in index:
        text = item["text"]
        source = item["source"]
        source_hint = Path(source).stem.replace("-", " ")
        document_counts = Counter(tokenize(f"{source_hint} {text}"))
        score = lexical_score(query_counts, document_counts)
        scored.append({"text": text, "source": source, "score": score})

    return sorted(scored, key=lambda item: item["score"], reverse=True)[:k]


def tokenize(text: str) -> list[str]:
    return [match.group(0).lower() for match in TOKEN_PATTERN.finditer(text)]


def lexical_score(query_counts: Counter[str], document_counts: Counter[str]) -> float:
    overlap = sum(
        min(count, document_counts.get(term, 0))
        for term, count in query_counts.items()
    )
    if overlap == 0:
        return 0.0
    return overlap / sum(query_counts.values())


def to_source_citation(chunk: dict) -> SourceCitation:
    return SourceCitation(
        filePath=chunk["source"],
        score=chunk["score"],
        snippet=snippet(chunk["text"]),
    )


def snippet(text: str, length: int = 180) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= length:
        return normalized
    return f"{normalized[: length - 3]}..."


def main() -> None:
    import uvicorn

    uvicorn.run("src.server:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
