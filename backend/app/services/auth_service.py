"""Authentication service — login, token generation, password change."""

import logging

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, Token

logger = logging.getLogger(__name__)


async def authenticate_user(
    db: AsyncSession,
    identifier: str,
    password: str,
) -> Token:
    """
    Validate credentials and return a JWT.

    ``identifier`` may be either the login_id (e.g. EMP-0001) or the email
    address — whichever the employee/admin types into the login form.
    """
    result = await db.execute(
        select(User).where(
            or_(User.login_id == identifier, User.email == identifier)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        logger.warning("Failed login attempt for identifier=%s", identifier)
        raise UnauthorizedError("Invalid credentials")

    if not user.is_active:
        raise ForbiddenError("Account is disabled")

    token = create_access_token({"user_id": user.id, "role": user.role})
    logger.info(
        "User authenticated  user_id=%s  login_id=%s  role=%s",
        user.id,
        user.login_id,
        user.role,
    )
    return Token(access_token=token)


async def change_password(
    db: AsyncSession,
    user: User,
    payload: ChangePasswordRequest,
) -> None:
    """Let a user change their own password."""
    if not verify_password(payload.current_password, user.hashed_password):
        raise UnauthorizedError("Current password is incorrect")

    if payload.current_password == payload.new_password:
        raise ConflictError("New password must differ from the current password")

    user.hashed_password = hash_password(payload.new_password)
    user.must_change_password = False
    db.add(user)
    await db.commit()
    logger.info("Password changed  user_id=%s", user.id)
