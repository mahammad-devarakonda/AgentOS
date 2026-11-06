import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, verify_workspace_access
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceResponse], summary="List accessible workspaces")
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all workspaces owned or accessible by the authenticated user."""
    workspaces = db.query(Workspace).filter(Workspace.user_id == current_user.id).all()
    return [WorkspaceResponse.model_validate(w) for w in workspaces]


@router.get("/{workspace_id}", response_model=WorkspaceResponse, summary="Get workspace details")
def get_workspace(
    workspace_id: uuid.UUID,
    workspace: Workspace = Depends(verify_workspace_access),
):
    """Retrieve workspace details. Enforces workspace ownership/access."""
    return WorkspaceResponse.model_validate(workspace)

