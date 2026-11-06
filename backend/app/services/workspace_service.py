import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.workspace import Workspace


class WorkspaceService:
    @staticmethod
    def create_personal_workspace(db: Session, user: User) -> Workspace:
        """Create a default personal workspace for a newly registered user."""
        workspace_name = f"{user.full_name}'s Workspace"
        workspace = Workspace(
            user_id=user.id,
            name=workspace_name,
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        return workspace

    @staticmethod
    def get_user_workspace(db: Session, user_id: uuid.UUID) -> Optional[Workspace]:
        """Get the user's primary workspace."""
        return db.query(Workspace).filter(Workspace.user_id == user_id).first()

    @staticmethod
    def get_workspace_by_id(db: Session, workspace_id: uuid.UUID) -> Optional[Workspace]:
        """Get a workspace by ID."""
        return db.query(Workspace).filter(Workspace.id == workspace_id).first()

    @staticmethod
    def can_access_workspace(db: Session, user_id: uuid.UUID, workspace_id: uuid.UUID) -> bool:
        """
        Check if user has access to the workspace.
        In Version 1, individual users access their own personal workspaces.
        Modularized so organization membership checks can be plugged in here in future versions.
        """
        workspace = db.query(Workspace).filter(
            Workspace.id == workspace_id,
            Workspace.user_id == user_id
        ).first()
        return workspace is not None

