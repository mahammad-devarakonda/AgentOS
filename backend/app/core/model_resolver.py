import re
from typing import List, Optional, Tuple
from app.core.config import settings
from app.core.http_client import http_client_manager


class GroqModelResolver:
    """Dynamically discovers available Groq chat models via HTTPX and selects the best working model."""

    GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models"

    # Keywords identifying non-chat models (TTS, Whisper, Guard/Moderation, Embeddings)
    EXCLUDED_KEYWORDS = (
        "whisper",
        "guard",
        "safeguard",
        "tts",
        "playai",
        "orpheus",
        "embed",
        "moderation",
        "vision-preview",
        "allam",
    )

    # Ranked preferences from strongest to lightest general-purpose instruction/chat models
    PREFERRED_PATTERNS: List[Tuple[str, int]] = [
        (r"llama-3\.3-70b-versatile", 100),
        (r"llama-3\.1-70b", 95),
        (r"qwen.*32b", 92),
        (r"deepseek.*70b", 90),
        (r"llama-4-maverick", 89),
        (r"llama-4-scout", 88),
        (r"kimi", 86),
        (r"gpt-oss-120b", 85),
        (r"qwen", 82),
        (r"llama.*70b", 80),
        (r"mixtral-8x7b", 75),
        (r"gemma2-9b-it", 72),
        (r"llama-3\.1-8b-instant", 70),
        (r"llama.*8b", 65),
        (r"gemma", 60),
    ]

    _cached_models: List[str] = []
    _selected_model: Optional[str] = None
    _failed_models: set[str] = set()

    @classmethod
    def _is_chat_model(cls, model_id: str) -> bool:
        lower_id = model_id.lower()
        return not any(keyword in lower_id for keyword in cls.EXCLUDED_KEYWORDS)

    @classmethod
    def _score_model(cls, model_id: str) -> int:
        lower_id = model_id.lower()
        # If the user explicitly configured a model in .env and it exists in their account, prioritize it
        if (
            settings.GROQ_MODEL
            and settings.GROQ_MODEL.lower() != "auto"
            and lower_id == settings.GROQ_MODEL.lower()
        ):
            return 110

        for pattern, score in cls.PREFERRED_PATTERNS:
            if re.search(pattern, lower_id):
                return score

        # Fallback heuristic: prefer larger parameter counts if mentioned (e.g., 70b > 32b > 8b)
        param_match = re.search(r"(\d+)b", lower_id)
        if param_match:
            return min(55, int(param_match.group(1)))
        return 30

    @classmethod
    async def fetch_available_chat_models(cls, force_refresh: bool = False) -> List[str]:
        """Queries Groq's /openai/v1/models endpoint using the shared HTTPX async client."""
        if cls._cached_models and not force_refresh:
            return [m for m in cls._cached_models if m not in cls._failed_models]

        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
            raise ValueError(
                "GROQ_API_KEY is not configured. Please set a valid GROQ_API_KEY in backend/.env"
            )

        client = http_client_manager.get_client()
        response = await client.get(
            cls.GROQ_MODELS_URL,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        )
        response.raise_for_status()
        payload = response.json()

        raw_models = [
            item.get("id", "")
            for item in payload.get("data", [])
            if isinstance(item, dict) and item.get("id") and item.get("active", True) is not False
        ]

        chat_models = [m for m in raw_models if cls._is_chat_model(m)]
        chat_models.sort(key=cls._score_model, reverse=True)

        cls._cached_models = chat_models
        return [m for m in cls._cached_models if m not in cls._failed_models]

    @classmethod
    async def get_best_model(cls, force_refresh: bool = False) -> str:
        """Returns the highest-ranked available Groq chat model."""
        if (
            cls._selected_model
            and cls._selected_model not in cls._failed_models
            and not force_refresh
        ):
            return cls._selected_model

        candidates = await cls.fetch_available_chat_models(force_refresh=force_refresh)
        if not candidates:
            # Reset failed set if exhausted and try once more
            cls._failed_models.clear()
            candidates = await cls.fetch_available_chat_models(force_refresh=True)

        if not candidates:
            raise RuntimeError("No active chat completion models found for this GROQ_API_KEY.")

        cls._selected_model = candidates[0]
        return cls._selected_model

    @classmethod
    async def mark_model_failed_and_get_next(cls, failed_model: str) -> str:
        """Marks a model as unavailable/failed and selects the next best available model."""
        cls._failed_models.add(failed_model)
        if cls._selected_model == failed_model:
            cls._selected_model = None
        return await cls.get_best_model(force_refresh=False)

