from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.workspaces import router as workspaces_router
from app.api.v1.resources import router as resources_router
from app.api.v1.agent import router as agent_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(workspaces_router)
api_router.include_router(resources_router)
api_router.include_router(agent_router)

