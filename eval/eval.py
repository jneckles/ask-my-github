"""Tiny retrieval-only eval for README source recall."""

from __future__ import annotations

import json
from pathlib import Path

from sentence_transformers import SentenceTransformer

from src.retriever import embed_query, load_index, top_k

QUESTIONS_PATH = Path("eval/questions.jsonl")
PASSING_RATE = 0.8


def read_questions(path: Path = QUESTIONS_PATH) -> list[dict]:
    questions = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            questions.append(json.loads(line))
    return questions


def main() -> int:
    questions = read_questions()
    index = load_index()
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    hits = 0

    for number, item in enumerate(questions, start=1):
        embedding = embed_query(item["question"], model)
        results = top_k(embedding, index, k=3)
        expected = item["expected_source"]
        hit = any(expected in result["source"] for result in results)
        hits += int(hit)
        status = "HIT " if hit else "MISS"
        print(f'Q{number}: "{item["question"]}" -> {status} (expected: {expected})')

    rate = hits / len(questions) if questions else 0
    print(f"Hit rate: {hits}/{len(questions)} ({rate:.0%})")
    return 0 if rate >= PASSING_RATE else 1


if __name__ == "__main__":
    raise SystemExit(main())
