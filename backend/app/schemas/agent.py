from pydantic import BaseModel, Field


class ResumeAnalyzeRequest(BaseModel):
    job_description: str = Field(..., min_length=10, description="The job description to analyze against")
    resume_content: str = Field(..., min_length=10, description="The resume/CV text content")


class ResumeAnalyzeResponse(BaseModel):
    content: str = Field(..., description="The agent's full analysis text (markdown)")
    tokens_used: int = Field(..., description="Total tokens consumed by the request")
    model: str = Field(..., description="The model used for the analysis")

