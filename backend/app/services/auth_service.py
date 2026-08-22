"""Authentication service — login, token generation, password change."""

import logging

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsError, ConflictError, ForbiddenError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.company import Company
from app.models.employee import Employee
from app.models.user import User, UserRole
from app.schemas.auth import ChangePasswordRequest, CompanySignup, CompanySignupResponse, Token
from app.services.login_id_service import generate_login_id

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


async def register_company(
    db: AsyncSession,
    data: CompanySignup,
) -> CompanySignupResponse:
    """
    Register a new company and create the initial Admin user and Employee record.
    """
    # 1. Check if email already exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise AlreadyExistsError(f"An account with email '{data.email}' already exists")

    # Split name into first and last name
    name_parts = data.admin_name.strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "Admin"

    # Generate atomic sequence login_id and employee_code
    login_id = await generate_login_id(db, first_name, last_name)

    try:
        # Create Company
        company = Company(name=data.company_name)
        db.add(company)
        await db.flush()

        # Create Admin User
        user = User(
            login_id=login_id,
            email=data.email,
            hashed_password=hash_password(data.password),
            role=UserRole.ADMIN,
            must_change_password=False,
            is_active=True,
            company_id=company.id,
        )
        db.add(user)
        await db.flush()

        # Create Admin Employee Record
        employee = Employee(
            user_id=user.id,
            company_id=company.id,
            employee_code=login_id,
            first_name=first_name,
            last_name=last_name,
            phone=data.phone,
            company=data.company_name,
            job_position="Administrator",
            department="HR & Admin",
        )
        db.add(employee)
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error("Failed to register company, transaction rolled back. Error: %s", e)
        raise e

    logger.info("Company registered  company_name=%s  login_id=%s", data.company_name, login_id)
    return CompanySignupResponse(
        success=True,
        login_id=login_id,
        email=data.email,
        message="Company registered successfully.",
    )

