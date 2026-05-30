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
    const message = await readErrorMessage(res);
    throw new Error(message ?? `API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

async function readErrorMessage(res: Response): Promise<string | null> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') {
      return body.detail;
    }
  } catch {
    return null;
  }

  return null;
}
