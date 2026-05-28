"""Load a local index and retrieve chunks by cosine similarity."""

from __future__ import annotations

import json

import numpy as np


def load_index(path: str = "data/index.json") -> list[dict]:
    with open(path, encoding="utf-8") as file:
        return json.load(file)


def embed_query(query: str, model) -> np.ndarray:
    return np.asarray(model.encode(query), dtype=float)


def top_k(query_embedding: np.ndarray, index: list[dict], k: int = 3) -> list[dict]:
    """Return the top-k chunks by cosine similarity."""
    scored = []
    query = np.asarray(query_embedding, dtype=float)
    query_norm = np.linalg.norm(query)

    for item in index:
        embedding = np.asarray(item["embedding"], dtype=float)
        denominator = query_norm * np.linalg.norm(embedding)
        score = 0.0 if denominator == 0 else float(np.dot(query, embedding) / denominator)
        scored.append({"text": item["text"], "source": item["source"], "score": score})

    return sorted(scored, key=lambda item: item["score"], reverse=True)[:k]
