from fastapi import APIRouter
from app.api.v1.endpoints import conversations, jobs, resume

api_router = APIRouter()
api_router.include_router(resume.router, prefix="/resumes", tags=["Resume Processing"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Job Search Multi-Agent"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
