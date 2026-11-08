export type MessageRole = 'user' | 'assistant' | 'system' | 'agent' | 'tool';

export interface MessageItem {
  id: string;
  conversation_id: string;
  role: MessageRole;
  sender_name?: string | null;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  agent_type: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: MessageItem | null;
}

export interface ConversationDetail extends ConversationItem {
  messages: MessageItem[];
}

export interface ConversationListResponse {
  total: number;
  items: ConversationItem[];
}

export interface CreateConversationPayload {
  title?: string;
  agent_type?: string;
  metadata?: Record<string, any>;
}

export interface CreateMessagePayload {
  role?: MessageRole;
  content: string;
  sender_name?: string;
  metadata?: Record<string, any>;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ConversationAnalyticsItem {
  id: string;
  title: string;
  agent_type: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  token_usage: TokenUsage;
  metadata: Record<string, any>;
  messages: MessageItem[];
}

export interface AgentTokenStats {
  agent_type: string;
  conversation_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ConversationAnalyticsResponse {
  total_conversations: number;
  total_tokens: TokenUsage;
  breakdown_by_agent: Record<string, AgentTokenStats>;
  conversations: ConversationAnalyticsItem[];
}


