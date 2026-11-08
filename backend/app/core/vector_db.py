import atexit
import os
from typing import Optional
from qdrant_client import QdrantClient
from app.core.config import settings


_qdrant_client: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    """Returns singleton QdrantClient instance (local embedded or remote cluster)."""
    global _qdrant_client
    if _qdrant_client is None:
        if settings.QDRANT_URL:
            _qdrant_client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
            )
        else:
            storage_path = settings.QDRANT_STORAGE_PATH
            if storage_path == ":memory:":
                _qdrant_client = QdrantClient(":memory:")
            else:
                os.makedirs(storage_path, exist_ok=True)
                _qdrant_client = QdrantClient(path=storage_path)
    return _qdrant_client


def close_qdrant_client() -> None:
    """Cleanly closes Qdrant client connection before python interpreter shutdown."""
    global _qdrant_client
    if _qdrant_client is not None:
        try:
            _qdrant_client.close()
        except Exception:
            pass
        _qdrant_client = None


atexit.register(close_qdrant_client)
