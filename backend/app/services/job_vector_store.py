import time
import uuid
from typing import Dict, List, Optional, Tuple
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.core.vector_db import get_qdrant_client
from app.schemas.job_search import JobPostingItem
from app.services.embedding_service import embedding_service


JOB_COLLECTION_NAME = "job_postings"
RESUME_COLLECTION_NAME = "resume_chunks"
VECTOR_DIMENSION = 384

# Specialized text splitter for resume chunking aligned with all-MiniLM-L6-v2 token limits
resume_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=60,
    separators=["\n\n", "\n", ". ", " ", ""],
    length_function=len,
)


class JobVectorStore:
    """Manages Qdrant vector indexing, dense semantic search, and RAG retrieval for jobs & resumes."""

    def __init__(self):
        self._collections_initialized = False

    def _ensure_collections(self, client: QdrantClient) -> None:
        if self._collections_initialized:
            return

        collections_res = client.get_collections()
        existing_names = {c.name for c in collections_res.collections}

        if JOB_COLLECTION_NAME not in existing_names:
            client.create_collection(
                collection_name=JOB_COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_DIMENSION, distance=Distance.COSINE),
            )

        if RESUME_COLLECTION_NAME not in existing_names:
            client.create_collection(
                collection_name=RESUME_COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_DIMENSION, distance=Distance.COSINE),
            )

        self._collections_initialized = True

    @staticmethod
    def _create_job_text_representation(job: JobPostingItem) -> str:
        """Creates semantic text representation for high-fidelity embedding."""
        skills_str = ", ".join(job.matched_skills + job.missing_skills)
        return (
            f"Role: {job.title}. Company: {job.company}. Location: {job.location}. "
            f"Type: {job.type}. Compensation: {job.salary}. "
            f"Requirements & Skills: {skills_str}. "
            f"Summary: {job.description}"
        )

    def upsert_jobs(self, jobs: List[JobPostingItem]) -> int:
        """Embeds and indexes jobs into the Qdrant vector store."""
        if not jobs:
            return 0

        client = get_qdrant_client()
        self._ensure_collections(client)

        texts = [self._create_job_text_representation(j) for j in jobs]
        embeddings = embedding_service.embed_documents_sync(texts)

        points = []
        for job, emb in zip(jobs, embeddings):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"job-{job.id}-{job.company}"))
            payload: Dict = {
                "job_id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "salary": job.salary,
                "type": job.type,
                "posted": job.posted,
                "description": job.description,
                "matched_skills": job.matched_skills,
                "missing_skills": job.missing_skills,
                "agent_summary": job.agent_summary,
                "apply_url": job.apply_url,
                "is_within_24h": job.is_within_24h,
                "application_tip": job.application_tip,
                "indexed_at": time.time(),
            }
            points.append(PointStruct(id=point_id, vector=emb, payload=payload))

        client.upsert(collection_name=JOB_COLLECTION_NAME, points=points)
        return len(points)

    def search_jobs(
        self,
        query: str,
        limit: int = 5,
        location_filter: Optional[str] = None,
    ) -> List[Tuple[JobPostingItem, float]]:
        """Performs dense vector semantic search against Qdrant job collection."""
        client = get_qdrant_client()
        self._ensure_collections(client)

        query_vec = embedding_service.embed_documents_sync([query])[0]

        search_filter = None
        if location_filter and location_filter.lower() not in ["all", "any", ""]:
            if "remote" in location_filter.lower():
                search_filter = Filter(
                    should=[
                        FieldCondition(key="location", match=MatchValue(value=location_filter)),
                        FieldCondition(key="location", match=MatchValue(value="Remote")),
                    ]
                )

        try:
            query_res = client.query_points(
                collection_name=JOB_COLLECTION_NAME,
                query=query_vec,
                query_filter=search_filter,
                limit=limit,
            )
            results = query_res.points
        except Exception:
            return []

        matched_jobs: List[Tuple[JobPostingItem, float]] = []
        for hit in results:
            payload = hit.payload or {}
            score = float(hit.score) if hasattr(hit, "score") else 0.85
            job_item = JobPostingItem(
                id=payload.get("job_id", str(uuid.uuid4())[:8]),
                title=payload.get("title", "Software Engineer"),
                company=payload.get("company", "Tech Co"),
                location=payload.get("location", "Remote"),
                salary=payload.get("salary", "Competitive"),
                type=payload.get("type", "Full-time"),
                posted=payload.get("posted", "Past 24h"),
                description=payload.get("description", ""),
                match_score=min(98, max(60, int(score * 100))),
                matched_skills=payload.get("matched_skills", []),
                missing_skills=payload.get("missing_skills", []),
                agent_summary=payload.get("agent_summary", ""),
                application_tip=payload.get("application_tip"),
                apply_url=payload.get("apply_url"),
                is_within_24h=payload.get("is_within_24h", True),
            )
            matched_jobs.append((job_item, score))

        return matched_jobs

    def index_resume(self, session_id: str, raw_text: str) -> int:
        """Chunks candidate resume and indexes into Qdrant for granular RAG retrieval."""
        client = get_qdrant_client()
        self._ensure_collections(client)

        # Split resume text into coherent chunks with overlap using RecursiveCharacterTextSplitter
        raw_chunks = [c.strip() for c in resume_splitter.split_text(raw_text) if len(c.strip()) > 20]
        if not raw_chunks:
            raw_chunks = [raw_text[:500]] if raw_text.strip() else []
        if not raw_chunks:
            return 0

        embeddings = embedding_service.embed_documents_sync(raw_chunks)
        points = []
        for idx, (chunk_text, emb) in enumerate(zip(raw_chunks, embeddings)):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"resume-{session_id}-{idx}"))
            payload = {
                "session_id": session_id,
                "chunk_index": idx,
                "text": chunk_text,
            }
            points.append(PointStruct(id=point_id, vector=emb, payload=payload))

        client.upsert(collection_name=RESUME_COLLECTION_NAME, points=points)
        return len(points)

    def retrieve_resume_evidence(
        self,
        session_id: str,
        job_requirement_query: str,
        limit: int = 3,
    ) -> List[Tuple[str, float]]:
        """Retrieves top candidate resume chunks matching a specific job requirement."""
        client = get_qdrant_client()
        self._ensure_collections(client)

        query_vec = embedding_service.embed_documents_sync([job_requirement_query])[0]
        session_filter = Filter(
            must=[
                FieldCondition(key="session_id", match=MatchValue(value=session_id)),
            ]
        )

        try:
            query_res = client.query_points(
                collection_name=RESUME_COLLECTION_NAME,
                query=query_vec,
                query_filter=session_filter,
                limit=limit,
            )
            results = query_res.points
        except Exception:
            return []

        evidence = []
        for hit in results:
            text = (hit.payload or {}).get("text", "")
            score = float(hit.score) if hasattr(hit, "score") else 0.0
            if text:
                evidence.append((text, score))

        return evidence


job_vector_store = JobVectorStore()
