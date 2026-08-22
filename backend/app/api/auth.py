"""Auth API router — login, /me, and password change."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_employee
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, CompanySignup, CompanySignupResponse, LoginRequest, Token
from app.schemas.user import UserOut
from app.services import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=Token, summary="Login with login_id or email")
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Accepts ``login_id`` (e.g. ``EMP-0001``) or email address as the identifier.
    Returns a Bearer JWT on success.
    """
    return await auth_service.authenticate_user(db, credentials.login_id, credentials.password)


@router.get("/me", response_model=UserOut, summary="Current user profile")
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@router.post("/signup", response_model=CompanySignupResponse, status_code=201, summary="Register a new company and Admin user")
async def signup(
    payload: CompanySignup,
    db: AsyncSession = Depends(get_db),
) -> CompanySignupResponse:
    """
    Public company registration endpoint.
    Creates Company, User (ADMIN role), and linked Employee record.
    """
    return await auth_service.register_company(db, payload)


@router.post("/change-password", status_code=204, summary="Change own password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Any authenticated user may change their own password.
    After a successful change, ``must_change_password`` is set to ``false``.
    """
    await auth_service.change_password(db, current_user, payload)