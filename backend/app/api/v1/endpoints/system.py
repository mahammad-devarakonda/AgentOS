from fastapi import APIRouter
from app.core.config import settings
from app.core.model_resolver import GroqModelResolver

router = APIRouter()


@router.get("/model", summary="Get active LLM model information")
async def get_active_model():
    """Returns the currently active Groq LLM model and provider information."""
    try:
        model = await GroqModelResolver.get_best_model()
    except Exception:
        model = (
            settings.GROQ_MODEL
            if settings.GROQ_MODEL and settings.GROQ_MODEL.lower() != "auto"
            else "llama-3.3-70b-versatile"
        )

    return {
        "model": model,
        "provider": "Groq",
        "status": "online",
        "description": f"Groq Cloud Acceleration ({model})",
    }
