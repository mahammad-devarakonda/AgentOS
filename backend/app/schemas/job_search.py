from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.resume import AgentExecutionStep


class ParsedCandidateProfile(BaseModel):
    full_name: str = Field(default="Candidate", description="Detected candidate name")
    detected_role: str = Field(default="Software Engineer", description="Primary professional title")
    seniority_level: str = Field(default="Senior", description="Seniority level (Junior, Mid, Senior, Lead, Staff)")
    years_of_experience: float = Field(default=0.0, description="Estimated years of professional experience")
    primary_skills: List[str] = Field(default_factory=list, description="Core programming languages and engineering capabilities")
    secondary_skills: List[str] = Field(default_factory=list, description="Supporting frameworks, libraries, and dev tools")
    domains: List[str] = Field(default_factory=list, description="Industry domains, e.g. AI/ML, Cloud Platforms, Fintech")


class MarketQueryParameters(BaseModel):
    search_queries: List[str] = Field(default_factory=list, description="Targeted keyword strings for job boards")
    boolean_string: str = Field(default="", description="Optimized boolean search string, e.g. '(Python OR FastAPI) AND (AI OR Agent)'")
    target_titles: List[str] = Field(default_factory=list, description="Recommended job titles aligned with candidate")
    experience_range: str = Field(default="3-6 years", description="Target experience bracket")
    recommended_locations: List[str] = Field(default_factory=list, description="Recommended job locations / remote work filters")


class JobPostingItem(BaseModel):
    id: str = Field(..., description="Unique job posting identifier")
    title: str = Field(..., description="Job posting title")
    company: str = Field(..., description="Hiring company name")
    location: str = Field(..., description="Location or Remote availability")
    salary: str = Field(..., description="Salary range or compensation details")
    type: str = Field(default="Full-time", description="Employment type (Full-time, Contract, etc.)")
    posted: str = Field(default="Recently posted", description="Posting timestamp or age")
    description: str = Field(default="", description="Role summary and responsibilities")
    match_score: int = Field(default=85, ge=0, le=100, description="Relevance and ATS compatibility score (0-100)")
    matched_skills: List[str] = Field(default_factory=list, description="Candidate skills directly matching job requirements")
    missing_skills: List[str] = Field(default_factory=list, description="Recommended skills or keywords to emphasize")
    agent_summary: str = Field(default="", description="AI agent evaluation commentary for this opportunity")
    application_tip: Optional[str] = Field(default=None, description="Tailored pitch recommendation for the application")
    apply_url: Optional[str] = Field(default=None, description="Direct application or job view URL on LinkedIn/RemoteOK")
    is_within_24h: bool = Field(default=True, description="Whether the position was posted within the past 24 hours")


class JobMatchEvaluationList(BaseModel):
    evaluations: List[JobPostingItem] = Field(default_factory=list, description="List of evaluated and scored job opportunities")


class OpportunityRankingSummary(BaseModel):
    total_jobs_evaluated: int = Field(default=0, description="Total opportunities scanned across boards")
    recommended_jobs_count: int = Field(default=0, description="Number of high-compatibility matches returned")
    top_career_trajectory: str = Field(default="", description="Strategic career progression insight for candidate")
    market_competitiveness: str = Field(default="", description="Market competitiveness assessment based on profile")


class JobSearchProcessResponse(BaseModel):
    filename: str
    target_role: Optional[str] = None
    preferred_location: Optional[str] = None
    candidate_profile: ParsedCandidateProfile
    market_parameters: MarketQueryParameters
    discovered_jobs: List[JobPostingItem] = Field(default_factory=list)
    ranking_summary: OpportunityRankingSummary
    agent_trace: List[AgentExecutionStep] = Field(default_factory=list)
    raw_text_preview: str = Field(default="")
    model: Optional[str] = Field(default="llama-3.3-70b-versatile", description="LLM used for generation")


class JobSearchTextRequest(BaseModel):
    raw_text: str = Field(..., min_length=20, description="Raw resume text")
    target_role: Optional[str] = Field(default=None, description="Optional target title")
    preferred_location: Optional[str] = Field(default=None, description="Optional preferred location or remote")

