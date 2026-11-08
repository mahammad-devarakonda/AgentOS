import os
from typing import List, Optional
import numpy as np
from fastembed import TextEmbedding

from app.core.config import settings

# Determine workspace cache directory
BASE_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FASTEMBED_CACHE_DIR = os.path.join(BASE_BACKEND_DIR, "fastembed_cache")
os.makedirs(FASTEMBED_CACHE_DIR, exist_ok=True)

# Disable symlinks warning and enforce offline if cached
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")


class EmbeddingService:
    """Manages dense vector generation using all-MiniLM-L6-v2 via FastEmbed."""

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[TextEmbedding] = None

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME
        self.dimension = 384  # all-MiniLM-L6-v2 is 384 dimensions

    def _get_model(self) -> TextEmbedding:
        if self._model is None:
            try:
                self._model = TextEmbedding(
                    model_name=self.model_name,
                    cache_dir=FASTEMBED_CACHE_DIR,
                    local_files_only=True,
                )
            except Exception:
                self._model = TextEmbedding(
                    model_name=self.model_name,
                    cache_dir=FASTEMBED_CACHE_DIR,
                )
        return self._model

    def embed_documents_sync(self, texts: List[str]) -> List[List[float]]:
        """Synchronously generates 384-dim dense embeddings for texts."""
        if not texts:
            return []
        model = self._get_model()
        return [emb.tolist() for emb in model.embed(texts)]

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generates 384-dimensional dense embeddings for a list of document chunks."""
        return self.embed_documents_sync(texts)

    async def embed_query(self, query: str) -> List[float]:
        """Generates embedding for a single search query or candidate profile string."""
        results = self.embed_documents_sync([query])
        if not results:
            return [0.0] * self.dimension
        return results[0]

    @staticmethod
    def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Computes cosine similarity between two 384-dim vectors in range [-1.0, 1.0]."""
        if not vec_a or not vec_b:
            return 0.0
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))


embedding_service = EmbeddingService()
