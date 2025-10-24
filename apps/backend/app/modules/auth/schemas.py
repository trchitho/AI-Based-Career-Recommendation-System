from pydantic import BaseModel, Field
from typing import Optional


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: Optional[str] = None


class SigninRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    user_id: int
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = None


class UserPublic(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None
