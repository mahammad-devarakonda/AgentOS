import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_raw_refresh_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.auth import RegisterRequest
from app.services.workspace_service import WorkspaceService


def utcnow():
    return datetime.now(timezone.utc)


class AuthService:
    @staticmethod
    def register_user(db: Session, reg_data: RegisterRequest) -> Tuple[User, Workspace]:
        """
        Register a new user:
        1. Validate email uniqueness (case-insensitive).
        2. Hash password with Argon2.
        3. Create User in PostgreSQL.
        4. Automatically create user's personal workspace.
        """
        normalized_email = reg_data.email.strip().lower()
        existing_user = db.query(User).filter(User.email == normalized_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists.",
            )

        password_hash = get_password_hash(reg_data.password)

        user = User(
            full_name=reg_data.full_name.strip(),
            email=normalized_email,
            password_hash=password_hash,
            is_active=True,
            is_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Automatic creation of personal workspace
        workspace = WorkspaceService.create_personal_workspace(db, user)

        return user, workspace

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> User:
        """Authenticate user by email and password."""
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled.",
            )

        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
            )

        return user

    @staticmethod
    def create_refresh_token(
        db: Session, user_id: uuid.UUID, remember_me: bool = False
    ) -> Tuple[str, RefreshToken]:
        """Generate and store a new rotating refresh token."""
        raw_token = generate_raw_refresh_token()
        token_hash = hash_token(raw_token)
        
        days = 30 if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
        expires_at = utcnow() + timedelta(days=days)

        token_record = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(token_record)
        db.commit()
        db.refresh(token_record)

        return raw_token, token_record

    @staticmethod
    def rotate_refresh_token(db: Session, raw_token: str) -> Tuple[str, User]:
        """
        Rotate refresh token:
        1. Find token record by hash.
        2. Detect token reuse (if token was already revoked, revoke all tokens for this user).
        3. Check expiry.
        4. Revoke used token.
        5. Issue new refresh token.
        """
        if not raw_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token required.",
            )

        token_hash = hash_token(raw_token)
        token_record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token.",
            )

        # Detect reuse of an already revoked token
        if token_record.revoked_at is not None:
            # Revoke all active tokens for this user as a security safeguard against token theft
            db.query(RefreshToken).filter(
                RefreshToken.user_id == token_record.user_id,
                RefreshToken.revoked_at.is_(None)
            ).update({"revoked_at": utcnow()})
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token reuse detected. Please log in again.",
            )

        # Check expiration
        now = utcnow()
        # Ensure aware datetime comparison
        record_expires_at = token_record.expires_at
        if record_expires_at.tzinfo is None:
            record_expires_at = record_expires_at.replace(tzinfo=timezone.utc)

        if record_expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please log in again.",
            )

        # Revoke the current token
        token_record.revoked_at = now
        db.commit()

        # Check user
        user = db.query(User).filter(User.id == token_record.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive.",
            )

        # Create new rotating refresh token
        new_raw_token, _ = AuthService.create_refresh_token(db, user.id)

        return new_raw_token, user

    @staticmethod
    def revoke_refresh_token(db: Session, raw_token: Optional[str]) -> bool:
        """Revoke a refresh token on logout."""
        if not raw_token:
            return False

        token_hash = hash_token(raw_token)
        token_record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if token_record and token_record.revoked_at is None:
            token_record.revoked_at = utcnow()
            db.commit()
            return True
        return False

    @staticmethod
    def set_refresh_cookie(response: Response, raw_token: str, remember_me: bool = False):
        """Set HttpOnly secure refresh token cookie."""
        max_age = (30 if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS) * 24 * 60 * 60
        response.set_cookie(
            key=settings.REFRESH_TOKEN_COOKIE_NAME,
            value=raw_token,
            max_age=max_age,
            expires=max_age,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            domain=settings.COOKIE_DOMAIN,
            path="/api/v1/auth",
        )

    @staticmethod
    def clear_refresh_cookie(response: Response):
        """Clear the refresh token cookie."""
        response.delete_cookie(
            key=settings.REFRESH_TOKEN_COOKIE_NAME,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            domain=settings.COOKIE_DOMAIN,
            path="/api/v1/auth",
        )

