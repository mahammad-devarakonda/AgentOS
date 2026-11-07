from typing import Optional
import httpx
from app.core.config import settings


class HttpClientManager:
    """Manages a shared asynchronous HTTPX client across the FastAPI lifespan."""

    _client: Optional[httpx.AsyncClient] = None

    @classmethod
    async def start(cls) -> None:
        if cls._client is None or cls._client.is_closed:
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.HTTPX_TIMEOUT_SECONDS),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
                headers={"User-Agent": "AgentOS-ResumeAnalyzer/1.0"},
            )

    @classmethod
    async def stop(cls) -> None:
        if cls._client is not None and not cls._client.is_closed:
            await cls._client.aclose()
            cls._client = None

    @classmethod
    def get_client(cls) -> httpx.AsyncClient:
        if cls._client is None or cls._client.is_closed:
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.HTTPX_TIMEOUT_SECONDS),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
                headers={"User-Agent": "AgentOS-ResumeAnalyzer/1.0"},
            )
        return cls._client


http_client_manager = HttpClientManager()

