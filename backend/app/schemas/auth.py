"""Auth and token Pydantic schemas."""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Accepts login_id or email as the identifier."""

    login_id: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    user_id: int


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
