"""User Pydantic schemas — never expose hashed_password."""

from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserOut(BaseModel):
    id: int
    login_id: str
    email: EmailStr
    role: UserRole
    must_change_password: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}