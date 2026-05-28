"""Build a local JSON index from README files."""

from __future__ import annotations

import json
from pathlib import Path

from sentence_transformers import SentenceTransformer

INDEX_PATH = Path("data/index.json")
SOURCES_PATH = Path("data/sources.txt")
MAX_CHARS = 800
WINDOW_CHARS = 500
OVERLAP_CHARS = 50
MIN_CHARS = 50


def chunk_markdown(text: str) -> list[str]:
    """Split markdown into small, readable chunks."""
    if not text.strip():
        return []

    chunks: list[str] = []
    for section in _split_h2_sections(text):
        chunks.extend(_split_oversized(section.strip()))
    return [chunk for chunk in chunks if len(chunk.strip()) >= MIN_CHARS]


def _split_h2_sections(text: str) -> list[str]:
    sections = text.strip().split("\n## ")
    result = []
    for index, section in enumerate(sections):
        if index > 0:
            section = "## " + section
        if section.strip():
            result.append(section.strip())
    return result


def _split_oversized(text: str) -> list[str]:
    if len(text) <= MAX_CHARS:
        return [text]

    chunks: list[str] = []
    for paragraph in text.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(paragraph) <= MAX_CHARS:
            chunks.append(paragraph)
        else:
            chunks.extend(_sliding_windows(paragraph))
    return chunks


def _sliding_windows(text: str) -> list[str]:
    step = WINDOW_CHARS - OVERLAP_CHARS
    windows = []
    for start in range(0, len(text), step):
        window = text[start : start + WINDOW_CHARS].strip()
        if window:
            windows.append(window)
        if start + WINDOW_CHARS >= len(text):
            break
    return windows


def read_source_paths(path: Path = SOURCES_PATH) -> list[Path]:
    sources = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            sources.append(Path(line).expanduser())
    return sources


def main() -> None:
    sources = read_source_paths()
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    records = []

    for source_path in sources:
        text = source_path.read_text(encoding="utf-8")
        chunks = chunk_markdown(text)
        embeddings = model.encode(chunks).tolist() if chunks else []
        for chunk, embedding in zip(chunks, embeddings):
            records.append(
                {
                    "text": chunk,
                    "source": str(source_path),
                    "embedding": embedding,
                }
            )

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Indexed {len(records)} chunks from {len(sources)} READMEs to {INDEX_PATH}")


if __name__ == "__main__":
    main()
