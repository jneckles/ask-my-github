"""Command-line question answering over indexed README chunks."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

from src.prompt import SYSTEM_PROMPT, build_user_message
from src.retriever import embed_query, load_index, top_k

DEFAULT_MODEL = "claude-sonnet-4-6"
FAST_MODEL = "claude-haiku-4-5"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ask questions about local README files.")
    parser.add_argument("question")
    parser.add_argument("--k", type=int, default=3)
    parser.add_argument("--fast", action="store_true")
    parser.add_argument("--show-chunks", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_dotenv()

    index_path = Path("data/index.json")
    if not index_path.exists():
        print("Missing data/index.json. Run `python -m src.ingest` first.", file=sys.stderr)
        return 1

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("Missing ANTHROPIC_API_KEY. Add it to .env or your shell.", file=sys.stderr)
        return 1

    index = load_index(str(index_path))
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    query_embedding = embed_query(args.question, model)
    chunks = top_k(query_embedding, index, k=args.k)

    print(f"[Retrieved {len(chunks)} chunks]")
    if args.show_chunks:
        print_chunks(chunks)

    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model=FAST_MODEL if args.fast else DEFAULT_MODEL,
        max_tokens=700,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_message(args.question, chunks)}],
    )

    answer = response.content[0].text.strip()
    print(answer)
    print_sources(chunks)
    return 0


def print_chunks(chunks: list[dict]) -> None:
    for number, chunk in enumerate(chunks, start=1):
        print(f"\n--- Chunk {number} | score={chunk['score']:.3f} | {chunk['source']} ---")
        print(chunk["text"])
    print()


def print_sources(chunks: list[dict]) -> None:
    seen = []
    for chunk in chunks:
        if chunk["source"] not in seen:
            seen.append(chunk["source"])

    print("\nSources:")
    for source in seen:
        print(f"- {source}")


if __name__ == "__main__":
    raise SystemExit(main())
