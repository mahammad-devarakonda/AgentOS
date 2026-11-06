import { getAccessToken } from './tokenStorage';

const BASE_URL = '/api/v1';

export interface ResumeAnalyzeRequest {
  job_description: string;
  resume_content: string;
}

export interface StreamChunk {
  content: string;
  model: string;
}

/**
 * Streams the resume analysis from the backend via Server-Sent Events (SSE).
 * Calls onChunk for each token received, onDone when the stream ends.
 */
export async function streamResumeAnalysis(
  payload: ResumeAnalyzeRequest,
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (message: string) => void
): Promise<void> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/agent/analyze-resume`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
  } catch {
    onError('Network error: could not reach the backend.');
    return;
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const detail = (errData as { detail?: string }).detail ?? `HTTP ${response.status}`;
    onError(detail);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('No response body from server.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const data = trimmed.slice('data:'.length).trim();

        if (data === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data) as StreamChunk;
          onChunk(parsed);
        } catch {
          // skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
    onDone();
  }
}
