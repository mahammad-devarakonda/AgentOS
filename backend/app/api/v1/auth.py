from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_workspace, get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenRefreshResponse,
)
from app.schemas.user import UserResponse
from app.schemas.workspace import WorkspaceResponse
from app.services.auth_service import AuthService
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new individual user",
)
def register(
    user_in: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Register a new individual user in AgentOS:
    - Validates email and password matching
    - Validates Terms & Conditions acceptance
    - Protects against duplicate email registrations
    - Securely hashes password using Argon2
    - Automatically provisions a personal workspace
    - Issues JWT access token and rotating HttpOnly refresh token
    """
    user, workspace = AuthService.register_user(db, user_in)
    
    # Generate tokens
    access_token = create_access_token(subject=user.id)
    raw_refresh_token, _ = AuthService.create_refresh_token(db, user.id, remember_me=False)
    
    # Set HttpOnly cookie
    AuthService.set_refresh_cookie(response, raw_refresh_token, remember_me=False)
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        workspace=WorkspaceResponse.model_validate(workspace),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate user and obtain tokens",
)
def login(
    login_in: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Authenticate user with email and password:
    - Verifies password with Argon2
    - Issues short-lived JWT access token
    - Issues long-lived rotating refresh token via HttpOnly cookie
    """
    user = AuthService.authenticate_user(db, login_in.email, login_in.password)
    workspace = WorkspaceService.get_user_workspace(db, user.id)
    if not workspace:
        workspace = WorkspaceService.create_personal_workspace(db, user)

    access_token = create_access_token(subject=user.id)
    raw_refresh_token, _ = AuthService.create_refresh_token(
        db, user.id, remember_me=login_in.remember_me
    )

    AuthService.set_refresh_cookie(response, raw_refresh_token, remember_me=login_in.remember_me)

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        workspace=WorkspaceResponse.model_validate(workspace),
    )


@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
    summary="Rotate refresh token and obtain a new access token",
)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Refresh access token:
    - Extracts refresh token from secure HttpOnly cookie
    - Rotates the refresh token (revokes old, issues new)
    - Detects token reuse and revokes tokens if compromised
    - Returns newly minted access token and updates HttpOnly cookie
    """
    cookie_token = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if not cookie_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found in cookies.",
        )

    new_raw_token, user = AuthService.rotate_refresh_token(db, cookie_token)
    
    # Set updated refresh token cookie
    AuthService.set_refresh_cookie(response, new_raw_token)

    new_access_token = create_access_token(subject=user.id)

    return TokenRefreshResponse(
        access_token=new_access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out user and revoke refresh token",
)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Log out:
    - Revokes current refresh token in database
    - Clears HttpOnly cookie on client
    """
    cookie_token = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if cookie_token:
        AuthService.revoke_refresh_token(db, cookie_token)

    AuthService.clear_refresh_cookie(response)
    return MessageResponse(message="Successfully logged out.")


@router.get(
    "/me",
    summary="Get current authenticated user profile and personal workspace",
)
def get_me(
    current_user: User = Depends(get_current_user),
    current_workspace: Workspace = Depends(get_current_workspace),
):
    """
    Returns profile of currently authenticated user along with their personal workspace.
    """
    return {
        "user": UserResponse.model_validate(current_user),
        "workspace": WorkspaceResponse.model_validate(current_workspace),
    }


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset instructions",
)
def forgot_password(
    forgot_in: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Trigger password reset workflow (stub for V1):
    Returns standard message to avoid email enumeration.
    """
    return MessageResponse(
        message="If an account with this email exists, password reset instructions have been sent."
    )
