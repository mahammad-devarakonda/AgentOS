import asyncio
from typing import List, Optional
import numpy as np
from fastembed import TextEmbedding

from app.core.config import settings


class EmbeddingService:
    """Manages dense vector generation using all-MiniLM-L6-v2 via FastEmbed."""

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[TextEmbedding] = None
    _lock = asyncio.Lock()

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME
        self.dimension = 384  # all-MiniLM-L6-v2 is 384 dimensions

    def _get_model(self) -> TextEmbedding:
        if self._model is None:
            self._model = TextEmbedding(model_name=self.model_name)
        return self._model

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generates 384-dimensional dense embeddings for a list of document chunks."""
        if not texts:
            return []
        
        loop = asyncio.get_running_loop()
        def _run_sync():
            model = self._get_model()
            embeddings_gen = model.embed(texts)
            return [emb.tolist() for emb in embeddings_gen]

        return await loop.run_in_executor(None, _run_sync)

    async def embed_query(self, query: str) -> List[float]:
        """Generates embedding for a single search query or candidate profile string."""
        results = await self.embed_documents([query])
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
