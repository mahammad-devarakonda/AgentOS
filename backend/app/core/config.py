from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AgentOS - Multi-Agent Resume Analyzer (5. Resume Processing)"
    API_V1_STR: str = "/api/v1"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "auto"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    HTTPX_TIMEOUT_SECONDS: float = 60.0
    DATABASE_PATH: str = "agentos.db"

    # Qdrant Vector Store & Embedding Configurations
    QDRANT_STORAGE_PATH: str = "qdrant_storage"
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Document Guardrails & Validation Configurations
    RESUME_CONFIDENCE_THRESHOLD: float = 0.85
    MAX_RESUME_FILE_SIZE_MB: int = 10
    MIN_RESUME_TEXT_CHARS: int = 100


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

