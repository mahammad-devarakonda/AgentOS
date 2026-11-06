import email_validator
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict

# Disable DNS deliverability check so validation works reliably without external network/DNS latency
email_validator.CHECK_DELIVERABILITY = False
email_validator.TEST_ENVIRONMENT = True


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgentOS"
    API_V1_STR: str = "/api/v1"

    # ── Security (JWT) ────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-use-a-strong-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Cookie settings ───────────────────────────────────────────────────────
    REFRESH_TOKEN_COOKIE_NAME: str = "agentos_refresh_token"
    COOKIE_SECURE: bool = False        # Set True in HTTPS production
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: Union[str, None] = None

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./agentos.db"

    # ── Groq AI ───────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-20b"

    # ── CORS ──────────────────────────────────────────────────────────────────
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
