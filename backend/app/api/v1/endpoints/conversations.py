from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.conversation import (
    ConversationAnalyticsResponse,
    ConversationCreate,
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationResponse,
    ConversationUpdate,
    MessageCreate,
    MessageResponse,
)
from app.services.conversation_service import conversation_service

router = APIRouter()


@router.get(
    "/analytics",
    response_model=ConversationAnalyticsResponse,
    summary="Get conversation analytics and token usage for Resume Analyzer and Job Search",
)
def get_conversation_analytics(
    agent_types: Optional[List[str]] = Query(
        default=["resume_analyzer", "job_search"],
        description="List of agent types to include (default: resume_analyzer and job_search)",
    ),
    limit: int = Query(default=100, ge=1, le=500, description="Max conversations to include"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    include_messages: bool = Query(default=True, description="Whether to include full messages"),
):
    """
    Returns all conversations conducted on Resume Analyzer and Job Search multi-agents,
    along with exact/estimated token counts (prompt, completion, and total tokens used),
    detailed message histories, and an aggregate breakdown by agent type.
    """
    return conversation_service.get_analytics(
        agent_types=agent_types,
        limit=limit,
        offset=offset,
        include_messages=include_messages,
    )


@router.get(
    "/resume-and-jobs",
    response_model=ConversationAnalyticsResponse,
    summary="Show all conversations done on Resume Analyzer and Job Search with token usage",
)
def get_resume_and_jobs_conversations(
    limit: int = Query(default=100, ge=1, le=500, description="Max conversations to include"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    include_messages: bool = Query(default=True, description="Whether to include messages"),
):
    """
    Dedicated endpoint showing all conversations done on Resume Analyzer and Job Search,
    displaying full message history and the total tokens used per conversation and overall.
    """
    return conversation_service.get_analytics(
        agent_types=["resume_analyzer", "job_search"],
        limit=limit,
        offset=offset,
        include_messages=include_messages,
    )



@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation session",
)
def create_conversation(payload: ConversationCreate):
    """Creates a new conversation record in the database."""
    return conversation_service.create_conversation(payload)


@router.delete(
    "",
    status_code=status.HTTP_200_OK,
    summary="Clear all conversation / execution history",
)
def clear_all_conversations():
    """Clears all history records and messages across all agents."""
    count = conversation_service.clear_all_conversations()
    return {"status": "success", "message": f"Cleared {count} history records."}


@router.get(
    "",
    response_model=ConversationListResponse,
    summary="List all conversations",
)
def list_conversations(
    agent_type: Optional[str] = Query(
        default=None,
        description="Filter conversations by agent domain (e.g. resume_analyzer, job_search, general)",
    ),
    limit: int = Query(default=50, ge=1, le=200, description="Page size"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
):
    """Retrieves paginated list of conversations with message counts and last message previews."""
    return conversation_service.list_conversations(
        agent_type=agent_type, limit=limit, offset=offset
    )


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get conversation detail with messages",
)
def get_conversation(conversation_id: str):
    """Retrieves full conversation details including all ordered chat messages."""
    conv = conversation_service.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return conv


@router.patch(
    "/{conversation_id}",
    response_model=ConversationResponse,
    summary="Update conversation metadata or title",
)
def update_conversation(conversation_id: str, payload: ConversationUpdate):
    """Updates the title or metadata of an existing conversation."""
    updated = conversation_service.update_conversation(conversation_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return updated


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete conversation",
)
def delete_conversation(conversation_id: str):
    """Deletes a conversation and cascades to delete all stored messages."""
    deleted = conversation_service.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return {"status": "success", "message": f"Conversation '{conversation_id}' deleted successfully."}


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a message to a conversation",
)
def add_message(conversation_id: str, payload: MessageCreate):
    """Stores a new message (user, assistant, agent, or tool) in the conversation."""
    msg = conversation_service.add_message(conversation_id, payload)
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return msg


@router.get(
    "/{conversation_id}/messages",
    response_model=List[MessageResponse],
    summary="Get messages for a conversation",
)
def get_messages(
    conversation_id: str,
    limit: int = Query(default=100, ge=1, le=500, description="Max messages to retrieve"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
):
    """Retrieves messages for a given conversation in chronological order."""
    conv = conversation_service.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return conversation_service.get_messages(conversation_id, limit=limit, offset=offset)


@router.delete(
    "/{conversation_id}/messages/{message_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a single message",
)
def delete_message(conversation_id: str, message_id: str):
    """Deletes an individual message within a conversation."""
    deleted = conversation_service.delete_message(conversation_id, message_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message '{message_id}' not found in conversation '{conversation_id}'.",
        )
    return {"status": "success", "message": f"Message '{message_id}' deleted."}


@router.delete(
    "/{conversation_id}/messages",
    status_code=status.HTTP_200_OK,
    summary="Clear all messages in a conversation",
)
def clear_messages(conversation_id: str):
    """Clears all message history while keeping the conversation container."""
    conv = conversation_service.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    conversation_service.clear_messages(conversation_id)
    return {"status": "success", "message": f"All messages cleared for conversation '{conversation_id}'."}
