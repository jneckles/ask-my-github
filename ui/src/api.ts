import type { AskRequest, AskResponse } from './types';

const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export async function ask(request: AskRequest): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// Mock for Saturday morning — swap to real `ask` once backend is deployed.
export async function askMock(request: AskRequest): Promise<AskResponse> {
  await new Promise((r) => setTimeout(r, 600));

  if (request.question.toLowerCase().includes('private')) {
    return {
      answer: '',
      refused: true,
      refusalReason: 'No supporting context found in the indexed READMEs.',
      sources: [],
      latencyMs: 612,
    };
  }

  return {
    answer:
      'The repo uses a deterministic source-file-match eval harness instead of LLM-as-judge to keep retrieval regressions distinguishable from generation regressions.',
    refused: false,
    sources: [
      {
        filePath: 'ask-my-github/README.md',
        score: 0.84,
        snippet: 'eval/questions.jsonl + eval/eval.py runs source-file match...',
      },
      {
        filePath: 'ask-my-github/eval/README.md',
        score: 0.72,
        snippet: 'Each question carries the expected source file path...',
      },
    ],
    latencyMs: 612,
  };
}
