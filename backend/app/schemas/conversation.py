from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    AGENT = "agent"
    TOOL = "tool"


class MessageCreate(BaseModel):
    role: MessageRole = Field(default=MessageRole.USER, description="Role of the message sender")
    content: str = Field(..., min_length=1, description="Message text content")
    sender_name: Optional[str] = Field(default=None, description="Optional display name (e.g. Agent name)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom metadata or state payload")


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    sender_name: Optional[str] = None
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ConversationCreate(BaseModel):
    title: Optional[str] = Field(default=None, description="Title of conversation; auto-generated if omitted")
    agent_type: str = Field(default="general", description="Agent domain (e.g. resume_analyzer, job_search, general)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata or initial session state")


class ConversationUpdate(BaseModel):
    title: Optional[str] = Field(default=None, description="Updated conversation title")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Updated metadata dictionary")


class ConversationResponse(BaseModel):
    id: str
    title: str
    agent_type: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
    message_count: int = 0
    last_message: Optional[MessageResponse] = None


class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    agent_type: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
    messages: List[MessageResponse] = Field(default_factory=list)


class ConversationListResponse(BaseModel):
    total: int
    items: List[ConversationResponse]


class TokenUsage(BaseModel):
    prompt_tokens: int = Field(default=0, description="Input / prompt tokens consumed")
    completion_tokens: int = Field(default=0, description="Output / generated tokens consumed")
    total_tokens: int = Field(default=0, description="Total tokens consumed")


class ConversationAnalyticsItem(BaseModel):
    id: str
    title: str
    agent_type: str
    created_at: str
    updated_at: str
    message_count: int
    token_usage: TokenUsage
    metadata: Dict[str, Any] = Field(default_factory=dict)
    messages: List[MessageResponse] = Field(default_factory=list)


class AgentTokenStats(BaseModel):
    agent_type: str
    conversation_count: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ConversationAnalyticsResponse(BaseModel):
    total_conversations: int
    total_tokens: TokenUsage
    breakdown_by_agent: Dict[str, AgentTokenStats]
    conversations: List[ConversationAnalyticsItem]


