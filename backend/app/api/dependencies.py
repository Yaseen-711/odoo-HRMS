"""FastAPI dependency factories for authentication and authorization.

Usage in route handlers:
    current_user: User = Depends(get_current_user)
    admin: User = Depends(require_admin)
    employee: User = Depends(require_employee)
"""

import logging

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate JWT and return the authenticated User."""
    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedError("Invalid or expired token")

    user_id: int | None = payload.get("user_id")
    if user_id is None:
        raise UnauthorizedError("Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("User not found")

    if not user.is_active:
        raise ForbiddenError("Account is disabled")

    return user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that enforces ADMIN role."""
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenError("Admin access required")
    return current_user


async def require_employee(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that allows all roles (ADMIN, HR_OFFICER, and EMPLOYEE)."""
    return current_user


async def require_admin_or_hr(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that enforces ADMIN or HR_OFFICER role."""
    if current_user.role not in (UserRole.ADMIN, UserRole.HR_OFFICER):
        raise ForbiddenError("Admin or HR access required")
    return current_user
