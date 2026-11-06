import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_workspace_access
from app.models.resource import Agent, Project
from app.models.workspace import Workspace
from app.schemas.resource import AgentCreate, AgentResponse, ProjectCreate, ProjectResponse

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["Workspace Resources"])


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    workspace_id: uuid.UUID,
    project_in: ProjectCreate,
    workspace: Workspace = Depends(verify_workspace_access),
    db: Session = Depends(get_db),
):
    """Create a new project isolated inside the user's workspace."""
    project = Project(
        workspace_id=workspace.id,
        name=project_in.name,
        description=project_in.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(
    workspace_id: uuid.UUID,
    workspace: Workspace = Depends(verify_workspace_access),
    db: Session = Depends(get_db),
):
    """List all projects in this workspace only."""
    projects = db.query(Project).filter(Project.workspace_id == workspace.id).all()
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    workspace: Workspace = Depends(verify_workspace_access),
    db: Session = Depends(get_db),
):
    """Get a project ensuring it belongs to the authenticated user's workspace."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.workspace_id == workspace.id,
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse.model_validate(project)


@router.post("/agents", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def create_agent(
    workspace_id: uuid.UUID,
    agent_in: AgentCreate,
    workspace: Workspace = Depends(verify_workspace_access),
    db: Session = Depends(get_db),
):
    """Create a new agent isolated inside the user's workspace."""
    agent = Agent(
        workspace_id=workspace.id,
        name=agent_in.name,
        role=agent_in.role,
        description=agent_in.description,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return AgentResponse.model_validate(agent)


@router.get("/agents", response_model=List[AgentResponse])
def list_agents(
    workspace_id: uuid.UUID,
    workspace: Workspace = Depends(verify_workspace_access),
    db: Session = Depends(get_db),
):
    """List all agents in this workspace only."""
    agents = db.query(Agent).filter(Agent.workspace_id == workspace.id).all()
    return [AgentResponse.model_validate(a) for a in agents]

