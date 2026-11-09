from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.model_resolver import GroqModelResolver
from app.schemas.job_search import JobSearchProcessResponse, JobSearchTextRequest
from app.services.job_service import job_service
from app.utils.file_parser import extract_text_from_upload

router = APIRouter()


@router.get("/health", tags=["Job Search Health"])
async def job_search_health():
    """Returns health status for the multi-agent job search service."""
    best_model = None
    try:
        best_model = await GroqModelResolver.get_best_model()
    except Exception:
        best_model = settings.GROQ_MODEL

    return {
        "status": "ok",
        "module": "Job Search Multi-Agent Pipeline",
        "vector_database": "Qdrant",
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "rag_enabled": True,
        "pipeline_agents": [
            "Agent 1: Resume Parser & Profiler (Qdrant Chunk Indexer)",
            "Agent 2: Market Query Synthesizer",
            "Agent 3: Multi-Board Discovery Agent (Qdrant Dense Vector Search)",
            "Agent 4: ATS Fit & Relevance Matcher (Qdrant Evidence RAG)",
            "Agent 5: Opportunity Ranking Agent",
        ],
        "active_model": best_model,
    }


@router.post("/search", response_model=JobSearchProcessResponse, tags=["Job Search Multi-Agent"])
async def search_jobs_with_resume_file(
    file: UploadFile = File(..., description="Resume file in PDF or DOCX format"),
    target_role: Optional[str] = Form(default=None, description="Optional target title or role"),
    preferred_location: Optional[str] = Form(default=None, description="Optional preferred location or remote"),
) -> JobSearchProcessResponse:
    """Uploads a resume file and runs the 5-agent Job Search pipeline."""
    return await job_service.process_uploaded_resume(
        file=file,
        target_role=target_role,
        preferred_location=preferred_location,
    )


@router.post("/search-text", response_model=JobSearchProcessResponse, tags=["Job Search Multi-Agent"])
async def search_jobs_with_resume_text(
    payload: JobSearchTextRequest,
) -> JobSearchProcessResponse:
    """Processes raw resume text through the 5-agent Job Search pipeline."""
    return await job_service.process_raw_resume_text(
        raw_text=payload.raw_text,
        filename="pasted_resume.txt",
        target_role=payload.target_role,
        preferred_location=payload.preferred_location,
    )


@router.post("/search-stream", tags=["Job Search Multi-Agent (Live Stream)"])
async def search_jobs_file_stream(
    file: UploadFile = File(..., description="Resume file in PDF or DOCX format"),
    target_role: Optional[str] = Form(default=None, description="Optional target title or role"),
    preferred_location: Optional[str] = Form(default=None, description="Optional preferred location or remote"),
):
    """Streams real-time step-by-step progress as each job search agent executes."""
    content_bytes = await file.read()
    return StreamingResponse(
        job_service.stream_job_search(
            file_bytes=content_bytes,
            filename=file.filename or "uploaded_resume",
            content_type=file.content_type,
            target_role=target_role,
            preferred_location=preferred_location,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/search-text-stream", tags=["Job Search Multi-Agent (Live Stream)"])
async def search_jobs_text_stream(
    payload: JobSearchTextRequest,
):
    """Streams real-time agent execution for raw resume text."""
    return StreamingResponse(
        job_service.stream_job_search(
            raw_text=payload.raw_text,
            filename="pasted_resume.txt",
            target_role=payload.target_role,
            preferred_location=payload.preferred_location,
        ),
        media_type="application/x-ndjson",
    )

