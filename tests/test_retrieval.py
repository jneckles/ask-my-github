import numpy as np

from src.retriever import top_k


def test_top_k_returns_exactly_k_results():
    index = [
        {"text": "alpha", "source": "a.md", "embedding": [1.0, 0.0]},
        {"text": "beta", "source": "b.md", "embedding": [0.0, 1.0]},
        {"text": "gamma", "source": "c.md", "embedding": [0.7, 0.7]},
    ]

    results = top_k(np.array([1.0, 0.0]), index, k=2)

    assert len(results) == 2


def test_top_k_sorts_by_score_descending():
    index = [
        {"text": "weak", "source": "weak.md", "embedding": [0.0, 1.0]},
        {"text": "strong", "source": "strong.md", "embedding": [1.0, 0.0]},
        {"text": "middle", "source": "middle.md", "embedding": [0.5, 0.5]},
    ]

    results = top_k(np.array([1.0, 0.0]), index, k=3)

    assert [result["text"] for result in results] == ["strong", "middle", "weak"]


def test_most_similar_chunk_ranks_first():
    index = [
        {
            "text": "Gomoku uses alpha-beta search for board moves.",
            "source": "gomoku/README.md",
            "embedding": [0.9, 0.1, 0.0],
        },
        {
            "text": "The SIEM lab detects SSH brute force attempts.",
            "source": "wazuh/README.md",
            "embedding": [0.0, 0.9, 0.1],
        },
        {
            "text": "Career operations tracks job applications.",
            "source": "career/README.md",
            "embedding": [0.1, 0.0, 0.9],
        },
    ]

    results = top_k(np.array([0.0, 1.0, 0.0]), index, k=1)

    assert results[0]["source"] == "wazuh/README.md"
