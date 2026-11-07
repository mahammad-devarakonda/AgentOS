import type { ResumeProcessResponse, StreamStepEvent } from '../types/resume';
import type { JobSearchProcessResponse, JobStreamStepEvent } from '../types/jobSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function consumeNdjsonStream<T>(
  response: Response,
  onEvent: (event: any) => void
): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported by the browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: T | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const event = JSON.parse(trimmed);
      onEvent(event);

      if (event.type === 'error') {
        throw new Error(event.message || 'Multi-agent processing failed');
      }
      if (event.type === 'complete' && event.result) {
        finalResult = event.result as T;
      }
    }
  }

  if (!finalResult) {
    throw new Error('Stream ended without returning a final analysis result.');
  }

  return finalResult;
}

export const resumeApi = {
  async processFileStream(
    file: File,
    targetRole: string | undefined,
    jobDescription: string | undefined,
    onEvent: (event: StreamStepEvent) => void
  ): Promise<ResumeProcessResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (targetRole?.trim()) {
      formData.append('target_role', targetRole.trim());
    }
    if (jobDescription?.trim()) {
      formData.append('job_description', jobDescription.trim());
    }

    const response = await fetch(`${API_BASE_URL}/resumes/process-stream`, {
      method: 'POST',
      body: formData,
    });

    return consumeNdjsonStream<ResumeProcessResponse>(response, onEvent);
  },

  async processTextStream(
    rawText: string,
    targetRole: string | undefined,
    jobDescription: string | undefined,
    onEvent: (event: StreamStepEvent) => void
  ): Promise<ResumeProcessResponse> {
    const response = await fetch(`${API_BASE_URL}/resumes/process-text-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw_text: rawText,
        target_role: targetRole?.trim() || null,
        job_description: jobDescription?.trim() || null,
      }),
    });

    return consumeNdjsonStream<ResumeProcessResponse>(response, onEvent);
  },
};

export const jobSearchApi = {
  async searchJobsFileStream(
    file: File,
    targetRole: string | undefined,
    preferredLocation: string | undefined,
    onEvent: (event: JobStreamStepEvent) => void
  ): Promise<JobSearchProcessResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (targetRole?.trim()) {
      formData.append('target_role', targetRole.trim());
    }
    if (preferredLocation?.trim()) {
      formData.append('preferred_location', preferredLocation.trim());
    }

    const response = await fetch(`${API_BASE_URL}/jobs/search-stream`, {
      method: 'POST',
      body: formData,
    });

    return consumeNdjsonStream<JobSearchProcessResponse>(response, onEvent);
  },

  async searchJobsTextStream(
    rawText: string,
    targetRole: string | undefined,
    preferredLocation: string | undefined,
    onEvent: (event: JobStreamStepEvent) => void
  ): Promise<JobSearchProcessResponse> {
    const response = await fetch(`${API_BASE_URL}/jobs/search-text-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw_text: rawText,
        target_role: targetRole?.trim() || null,
        preferred_location: preferredLocation?.trim() || null,
      }),
    });

    return consumeNdjsonStream<JobSearchProcessResponse>(response, onEvent);
  },
};
