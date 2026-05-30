# Ask My GitHub

## What this is

Ask My GitHub is a minimal RAG CLI that answers questions over your own GitHub project READMEs. It builds a local JSON index of README chunks, retrieves the most relevant chunks for a question, and asks Claude to answer only from that context. The artifact is intentionally small so the code can be read, tested, and defended in an interview.

## Frontend UI

The React + TypeScript frontend lives in `ui/`. It renders the same grounding contract as the CLI: answers show sources and scores, refusals are a first-class state, and failed requests are visually distinct from low-context refusals.

```bash
cd ui
npm install
npm run dev
```

Run the API in a second terminal:

```bash
python -m src.ingest
ask-api
```

## Quickstart

```bash
git clone https://github.com/<your-github-username>/ask-my-github.git
cd ask-my-github
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
```

Edit `.env` and set:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Edit `data/sources.txt` so each non-comment line points to one local README:

```text
/absolute/path/to/project-one/README.md
/absolute/path/to/project-two/README.md
```

Build the index and ask a question:

```bash
python -m src.ingest
ask "what does the Wazuh lab actually detect?"
```

## How it works

The ingest step reads README files from `data/sources.txt`, chunks them by Markdown section, embeds each chunk locally with `sentence-transformers/all-MiniLM-L6-v2`, and writes the result to `data/index.json`. At query time, the CLI embeds the question with the same model, ranks chunks by cosine similarity, sends the top chunks to Claude with a strict grounding prompt, and prints the answer plus sources.

```text
query
  -> local query embedding
  -> cosine similarity over data/index.json
  -> top-k README chunks
  -> Claude grounded answer
  -> answer + sources
```

## Design decisions

Why local embeddings (`all-MiniLM-L6-v2`) over hosted: local embeddings keep the indexing path understandable and avoid needing a second paid API just to build the corpus. The trade-off is that results may vary across machines if model versions or native libraries differ.

Why a single JSON file instead of a vector DB: the target corpus is a few README files, so a JSON file is easier to inspect, regenerate, and explain. A vector database would add operational weight before the project has enough data to justify it.

Why chunk by header first: README headings usually represent meaningful project concepts, so header-first chunking preserves the author's structure. Paragraph and sliding-window fallbacks handle long sections without introducing a more complex parser.

Why instruct Claude to refuse on no-match: the point of this tool is grounded project QA, not general chat. A hard refusal string makes unsupported answers visible and testable instead of quietly mixing README facts with model guesses.

Why a hand-written eval instead of LLM-as-judge: the first thing to measure is whether retrieval found the expected source file. That can be checked deterministically with a small JSONL file before adding subjective answer-quality evaluation.

## What I'd change to ship this for real

- Hosted embeddings for cross-machine determinism
- pgvector or similar for more than 1,000 chunks
- A cross-encoder re-ranker over top-10 to top-3
- Structured citation objects instead of free-text sources
- Async batch ingest
- Incremental indexing on file mtime
- Multi-turn chat with history

## Known limitations

- Tiny corpus
- No incremental indexing
- No chat history
- English-only embedder
- No auth or multi-user support
- All-local index storage

## Project structure

```text
ask-my-github/
├── README.md
├── pyproject.toml
├── .env.example
├── .gitignore
├── src/
│   ├── __init__.py
│   ├── ingest.py
│   ├── retriever.py
│   ├── ask.py
│   └── prompt.py
├── data/
│   ├── sources.txt
│   └── index.json
├── eval/
│   ├── questions.jsonl
│   └── eval.py
├── ui/
│   ├── README.md
│   ├── package.json
│   └── src/
└── tests/
    ├── __init__.py
    ├── test_chunking.py
    └── test_retrieval.py
```

`eval/questions.jsonl` contains one JSON object per line:

```json
{"question": "what does the Wazuh lab detect?", "expected_source": "wazuh-ssh-siem-lab/README.md"}
```
