from typing import List, Optional, TypedDict
from app.schemas.resume import AgentExecutionStep
from app.schemas.guardrails import ResumeClassificationResult
from app.schemas.job_search import (
    JobPostingItem,
    MarketQueryParameters,
    OpportunityRankingSummary,
    ParsedCandidateProfile,
)


class JobSearchGraphState(TypedDict, total=False):
    """Shared state across the LangGraph multi-agent Job Search pipeline."""

    session_id: Optional[str]
    filename: str
    file_bytes: Optional[bytes]
    content_type: Optional[str]
    raw_text: str
    target_role: Optional[str]
    preferred_location: Optional[str]
    classification: Optional[ResumeClassificationResult]
    validation_status: Optional[str]
    candidate_profile: ParsedCandidateProfile
    market_parameters: MarketQueryParameters
    discovered_jobs: List[JobPostingItem]
    scored_jobs: List[JobPostingItem]
    ranking_summary: OpportunityRankingSummary
    agent_trace: List[AgentExecutionStep]
    indexed_chunks_count: Optional[int]
    error: Optional[str]
