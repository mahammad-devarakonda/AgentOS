import type { ResumeProcessResponse, StreamStepEvent } from '../types/resume';
import type { JobSearchProcessResponse, JobStreamStepEvent } from '../types/jobSearch';
import type {
  ConversationAnalyticsResponse,
  ConversationDetail,
  ConversationItem,
  ConversationListResponse,
  CreateConversationPayload,
  CreateMessagePayload,
  MessageItem,
} from '../types/conversation';

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

export const conversationApi = {
  async listConversations(agentType?: string, limit: number = 50, offset: number = 0): Promise<ConversationListResponse> {
    const params = new URLSearchParams();
    if (agentType) params.append('agent_type', agentType);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const res = await fetch(`${API_BASE_URL}/conversations?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to list conversations: ${res.statusText}`);
    }
    return res.json();
  },

  async getConversation(id: string): Promise<ConversationDetail> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to get conversation ${id}: ${res.statusText}`);
    }
    return res.json();
  },

  async createConversation(payload: CreateConversationPayload): Promise<ConversationItem> {
    const res = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to create conversation: ${res.statusText}`);
    }
    return res.json();
  },

  async updateConversation(id: string, payload: { title?: string; metadata?: Record<string, any> }): Promise<ConversationItem> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to update conversation: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to delete conversation: ${res.statusText}`);
    }
  },

  async clearAllConversations(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to clear history: ${res.statusText}`);
    }
  },

  async addMessage(conversationId: string, payload: CreateMessagePayload): Promise<MessageItem> {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to add message: ${res.statusText}`);
    }
    return res.json();
  },

  async getMessages(conversationId: string, limit: number = 100, offset: number = 0): Promise<MessageItem[]> {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to get messages: ${res.statusText}`);
    }
    return res.json();
  },

  async getAnalytics(agentTypes?: string[], limit: number = 100, offset: number = 0): Promise<ConversationAnalyticsResponse> {
    const params = new URLSearchParams();
    if (agentTypes && agentTypes.length > 0) {
      agentTypes.forEach((t) => params.append('agent_types', t));
    }
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const res = await fetch(`${API_BASE_URL}/conversations/analytics?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to get conversation analytics: ${res.statusText}`);
    }
    return res.json();
  },

  async getResumeAndJobsConversations(limit: number = 100, offset: number = 0): Promise<ConversationAnalyticsResponse> {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const res = await fetch(`${API_BASE_URL}/conversations/resume-and-jobs?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to get resume and jobs conversations: ${res.statusText}`);
    }
    return res.json();
  },
};

export interface SystemModelInfo {
  model: string;
  provider: string;
  status: string;
  description?: string;
}

export const systemApi = {
  async getActiveModel(): Promise<SystemModelInfo> {
    try {
      const res = await fetch(`${API_BASE_URL}/system/model`);
      if (!res.ok) {
        return {
          model: '',
          provider: '',
          status: 'online',
          description: '',
        };
      }
      return await res.json();
    } catch {
      return {
        model: '',
        provider: '',
        status: 'online',
        description: '',
      };
    }
  },
};


