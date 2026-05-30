// API contract between the React frontend and the ask-my-github FastAPI backend.
// Mirrors the structure of eval/questions.jsonl on the Python side.

export interface AskRequest {
  question: string;
  topK?: number;
}

export interface SourceCitation {
  filePath: string;
  score: number;
  snippet: string;
}

export interface AskResponse {
  answer: string;
  refused: boolean;
  refusalReason?: string;
  sources: SourceCitation[];
  latencyMs: number;
}

export type AskState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; response: AskResponse }
  | { kind: 'error'; message: string };
