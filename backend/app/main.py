from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.http_client import http_client_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages startup and shutdown of shared async HTTPX client."""
    await http_client_manager.start()
    yield
    await http_client_manager.stop()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Multi-Agent Resume Analyzer using FastAPI, LangGraph, Groq, and HTTPX (5. Resume Processing)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.APP_NAME,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/resumes/health",
    }

