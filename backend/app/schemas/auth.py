import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from app.schemas.user import UserResponse
from app.schemas.workspace import WorkspaceResponse


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    terms_accepted: bool = Field(..., description="Must accept terms and conditions")

    @model_validator(mode="after")
    def validate_passwords_and_terms(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        if not self.terms_accepted:
            raise ValueError("You must agree to the Terms and Conditions")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    remember_me: bool = False


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    workspace: WorkspaceResponse

    model_config = ConfigDict(from_attributes=True)


class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

