from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.model_resolver import GroqModelResolver
from app.schemas.resume import ResumeProcessResponse, ResumeTextProcessRequest
from app.services.resume_service import resume_service
from app.utils.file_parser import extract_text_from_upload

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    """Returns health status, available Groq models, and the automatically selected best model."""
    is_groq_configured = bool(
        settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your_groq_api_key_here"
    )
    selected_model = None
    available_models = []
    if is_groq_configured:
        try:
            available_models = await GroqModelResolver.fetch_available_chat_models()
            selected_model = await GroqModelResolver.get_best_model()
        except Exception:
            selected_model = settings.GROQ_MODEL

    return {
        "status": "ok",
        "module": "5. Resume Processing",
        "llm_provider": "Groq",
        "configured_preference": settings.GROQ_MODEL,
        "selected_best_model": selected_model,
        "available_chat_models": available_models,
        "groq_api_configured": is_groq_configured,
    }


@router.get("/models", tags=["Models"])
async def list_groq_models(refresh: bool = False):
    """Discovers all available Groq chat models for your API key and returns the ranked best choice."""
    models = await GroqModelResolver.fetch_available_chat_models(force_refresh=refresh)
    best = await GroqModelResolver.get_best_model(force_refresh=False)
    return {
        "selected_best_model": best,
        "total_available": len(models),
        "ranked_models": models,
    }


@router.post("/process", response_model=ResumeProcessResponse, tags=["Resume Processing"])
async def process_resume_file(
    file: UploadFile = File(..., description="Resume file in PDF, DOCX, or TXT format"),
    target_role: Optional[str] = Form(default=None, description="Optional target job role"),
    job_description: Optional[str] = Form(default=None, description="Optional job description text"),
) -> ResumeProcessResponse:
    """Uploads a resume file (PDF/DOCX/TXT) and executes the LangGraph multi-agent analyzer."""
    return await resume_service.process_uploaded_resume(
        file=file,
        target_role=target_role,
        job_description=job_description,
    )


@router.post("/process-text", response_model=ResumeProcessResponse, tags=["Resume Processing"])
async def process_resume_text(
    payload: ResumeTextProcessRequest,
) -> ResumeProcessResponse:
    """Processes raw pasted resume text through the LangGraph multi-agent analyzer."""
    return await resume_service.process_raw_resume_text(
        raw_text=payload.raw_text,
        filename="pasted_resume.txt",
        target_role=payload.target_role,
        job_description=payload.job_description,
    )


@router.post("/process-stream", tags=["Resume Processing (Live Stream)"])
async def process_resume_file_stream(
    file: UploadFile = File(..., description="Resume file in PDF, DOCX, or TXT format"),
    target_role: Optional[str] = Form(default=None, description="Optional target job role"),
    job_description: Optional[str] = Form(default=None, description="Optional job description text"),
):
    """Streams real-time step-by-step agent progress (NDJSON) for an uploaded resume file."""
    raw_text = await extract_text_from_upload(file)
    return StreamingResponse(
        resume_service.stream_resume_processing(
            raw_text=raw_text,
            filename=file.filename or "uploaded_resume",
            target_role=target_role,
            job_description=job_description,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/process-text-stream", tags=["Resume Processing (Live Stream)"])
async def process_resume_text_stream(
    payload: ResumeTextProcessRequest,
):
    """Streams real-time step-by-step agent progress (NDJSON) for pasted resume text."""
    return StreamingResponse(
        resume_service.stream_resume_processing(
            raw_text=payload.raw_text,
            filename="pasted_resume.txt",
            target_role=payload.target_role,
            job_description=payload.job_description,
        ),
        media_type="application/x-ndjson",
    )
