from src.ingest import chunk_markdown


def test_empty_string_returns_empty_list():
    assert chunk_markdown("") == []


def test_short_document_without_headers_returns_one_chunk():
    text = "This README explains a small project with enough detail to keep the chunk."
    assert chunk_markdown(text) == [text]


def test_three_h2_sections_return_three_chunks():
    text = (
        "## First\nThis section has enough text to survive the minimum chunk filter.\n"
        "## Second\nThis section has enough text to survive the minimum chunk filter.\n"
        "## Third\nThis section has enough text to survive the minimum chunk filter."
    )

    chunks = chunk_markdown(text)

    assert len(chunks) == 3
    assert chunks[0].startswith("## First")
    assert chunks[1].startswith("## Second")
    assert chunks[2].startswith("## Third")


def test_oversized_section_gets_split_by_paragraph():
    first = "A" * 600
    second = "B" * 600
    chunks = chunk_markdown(f"## Long\n{first}\n\n{second}")

    assert len(chunks) == 2
    assert chunks[0].startswith("## Long")
    assert chunks[1] == second


def test_long_paragraph_uses_sliding_window_overlap():
    text = "## Long\n" + "".join(str(index % 10) for index in range(1000))
    chunks = chunk_markdown(text)

    assert len(chunks) == 3
    assert len(chunks[0]) == 500
    assert chunks[0][-50:] == chunks[1][:50]


def test_chunks_under_50_chars_are_dropped():
    assert chunk_markdown("## Tiny\nToo short.") == []
