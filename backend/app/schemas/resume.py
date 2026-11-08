from typing import List, Optional
from pydantic import BaseModel, Field


class ContactInfo(BaseModel):
    full_name: str = Field(default="Unknown Candidate", description="Full name of the candidate")
    email: Optional[str] = Field(default=None, description="Email address")
    phone: Optional[str] = Field(default=None, description="Phone number")
    location: Optional[str] = Field(default=None, description="City, State, or Country")
    linkedin: Optional[str] = Field(default=None, description="LinkedIn URL")
    github: Optional[str] = Field(default=None, description="GitHub or portfolio URL")


class SkillCategory(BaseModel):
    technical_skills: List[str] = Field(default_factory=list, description="Core programming languages and technical domains")
    tools_and_frameworks: List[str] = Field(default_factory=list, description="Libraries, frameworks, cloud platforms, and tools")
    soft_skills: List[str] = Field(default_factory=list, description="Interpersonal, leadership, and communication skills")


class WorkExperienceItem(BaseModel):
    company: str = Field(default="", description="Company or organization name")
    role: str = Field(default="", description="Job title or role")
    duration: str = Field(default="", description="Start and end dates or duration")
    location: Optional[str] = Field(default=None, description="Job location")
    highlights: List[str] = Field(default_factory=list, description="Key responsibilities and quantified achievements")


class EducationItem(BaseModel):
    institution: str = Field(default="", description="University or school name")
    degree: str = Field(default="", description="Degree, major, or certification")
    graduation_year: Optional[str] = Field(default=None, description="Graduation year or period")
    gpa_or_honors: Optional[str] = Field(default=None, description="GPA, honors, or distinctions")


class ProjectItem(BaseModel):
    title: str = Field(default="", description="Project title")
    description: str = Field(default="", description="Summary of what was built and its impact")
    technologies: List[str] = Field(default_factory=list, description="Tech stack used in the project")
    link: Optional[str] = Field(default=None, description="URL to project repository or live demo")


class ExtractedResumeProfile(BaseModel):
    contact: ContactInfo = Field(default_factory=ContactInfo)
    professional_summary: str = Field(default="", description="Executive summary of the candidate")
    total_years_experience: float = Field(default=0.0, description="Estimated total years of professional experience")
    skills: SkillCategory = Field(default_factory=SkillCategory)
    work_experience: List[WorkExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)


class SectionScores(BaseModel):
    impact_and_metrics: int = Field(default=0, ge=0, le=100, description="Score for quantified impact and metrics (0-100)")
    ats_compatibility: int = Field(default=0, ge=0, le=100, description="Score for ATS formatting and keyword clarity (0-100)")
    skills_relevance: int = Field(default=0, ge=0, le=100, description="Score for depth and relevance of technical skills (0-100)")
    experience_clarity: int = Field(default=0, ge=0, le=100, description="Score for clarity and progression of work experience (0-100)")


class ResumeAnalysisEvaluation(BaseModel):
    overall_score: int = Field(default=0, ge=0, le=100, description="Overall resume quality & ATS match score (0-100)")
    role_fit_assessment: str = Field(default="", description="Assessment of how well the candidate fits the target role/JD")
    section_scores: SectionScores = Field(default_factory=SectionScores)
    key_strengths: List[str] = Field(default_factory=list, description="Top strengths identified in the resume")
    skill_gaps_or_missing_keywords: List[str] = Field(default_factory=list, description="Missing keywords or gaps relative to target role/JD")
    red_flags: List[str] = Field(default_factory=list, description="Formatting issues, vague descriptions, or timeline gaps")


class BulletRewriteItem(BaseModel):
    section: str = Field(default="Work Experience", description="Section where the original bullet appears")
    original_bullet: str = Field(default="", description="Original weak or unquantified bullet point")
    improved_bullet: str = Field(default="", description="Rewritten high-impact bullet point using Action + Context + Metric")
    rationale: str = Field(default="", description="Why this rewrite improves ATS/recruiter impact")


class ResumeEnhancementOutput(BaseModel):
    improved_summary: str = Field(default="", description="Polished, tailored executive summary ready to paste")
    bullet_rewrites: List[BulletRewriteItem] = Field(default_factory=list, description="Concrete before/after bullet point improvements")
    actionable_recommendations: List[str] = Field(default_factory=list, description="Prioritized next steps to improve the resume")


class VerificationAuditOutput(BaseModel):
    triggered: bool = Field(default=True, description="Whether QA verification was triggered due to score < 90")
    initial_score: int = Field(default=0, ge=0, le=100, description="Original score before verification audit")
    verified_projected_score: int = Field(default=0, ge=0, le=100, description="Projected score after applying verified improvements")
    audit_verdict: str = Field(default="", description="Verifier agent's overall audit summary of the prior agents' work")
    verified_checks: List[str] = Field(default_factory=list, description="Specific checks validated across extraction, scoring, and rewrites")
    critical_fixes_to_reach_90_plus: List[str] = Field(default_factory=list, description="Exact fixes required for the candidate to cross a 90+ score")
    upgraded_summary: str = Field(default="", description="Verifier-refined executive summary optimized for 90+ ATS match")


class ResumeTextProcessRequest(BaseModel):
    raw_text: str = Field(..., min_length=20, description="Raw resume text content")
    target_role: Optional[str] = Field(default=None, description="Optional target role (e.g., Senior Backend Engineer)")
    job_description: Optional[str] = Field(default=None, description="Optional job description to evaluate against")


class AgentExecutionStep(BaseModel):
    agent_name: str
    status: str
    summary: str


class ResumeProcessResponse(BaseModel):
    filename: str
    target_role: Optional[str] = None
    extracted_profile: ExtractedResumeProfile
    analysis: ResumeAnalysisEvaluation
    enhancements: ResumeEnhancementOutput
    verification: Optional[VerificationAuditOutput] = None
    agent_trace: List[AgentExecutionStep] = Field(default_factory=list)
    raw_text_preview: str = Field(default="", description="First 500 characters of parsed text")
    model: Optional[str] = Field(default="llama-3.3-70b-versatile", description="LLM used for generation")
