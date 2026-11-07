from typing import List, Optional, TypedDict
from app.schemas.resume import (
    AgentExecutionStep,
    ExtractedResumeProfile,
    ResumeAnalysisEvaluation,
    ResumeEnhancementOutput,
    VerificationAuditOutput,
)


class ResumeGraphState(TypedDict, total=False):
    """Shared state across the LangGraph multi-agent resume processing pipeline."""

    filename: str
    raw_text: str
    target_role: Optional[str]
    job_description: Optional[str]
    extracted_profile: ExtractedResumeProfile
    analysis: ResumeAnalysisEvaluation
    enhancements: ResumeEnhancementOutput
    verification: Optional[VerificationAuditOutput]
    agent_trace: List[AgentExecutionStep]
    error: Optional[str]

