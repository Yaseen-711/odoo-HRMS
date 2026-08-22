"""Employee service — Admin/HR-controlled onboarding and profile management."""

import logging
import secrets
import string
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AlreadyExistsError, ForbiddenError, NotFoundError
from app.core.security import hash_password
from app.models.employee import Employee
from app.models.user import User, UserRole
from app.schemas.employee import (
    EmployeeAdminOut,
    EmployeeCreate,
    EmployeeCreatedOut,
    EmployeeSelfUpdate,
    EmployeeUpdate,
)
from app.services.login_id_service import generate_login_id
from app.workers.jobs import enqueue_send_credentials_job

logger = logging.getLogger(__name__)

_PASSWORD_ALPHABET = string.ascii_letters + string.digits + "!@#$%"


def _generate_temp_password(length: int = 12) -> str:
    """Return a cryptographically random temporary password."""
    return "".join(secrets.choice(_PASSWORD_ALPHABET) for _ in range(length))


async def create_employee(
    db: AsyncSession,
    data: EmployeeCreate,
) -> EmployeeCreatedOut:
    """
    Admin/HR creates a new employee.

    Steps:
    1. Check for duplicate email.
    2. Generate login_id and employee_code using database-safe sequences.
    3. Generate temporary password.
    4. Create User + Employee in a single transaction with explicit error handling and rollback.
    5. Return the one-time credentials to the creator.
    """
    # Check duplicate email in users table
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise AlreadyExistsError(f"A user with email '{data.email}' already exists")

    temp_password = _generate_temp_password()
    joining_year = data.date_of_joining.year if data.date_of_joining else None

    # Generate login_id using the atomic sequence-based generator
    login_id = await generate_login_id(
        db, data.first_name, data.last_name, joining_year
    )

    # Derive default employee_code from the unique sequence serial if not provided
    if not data.employee_code:
        serial_str = login_id[-4:]
        employee_code = f"EMP-{serial_str}"
    else:
        employee_code = data.employee_code

    # Create the user and employee records in a single database transaction block
    try:
        user = User(
            login_id=login_id,
            email=data.email,
            hashed_password=hash_password(temp_password),
            role=UserRole.EMPLOYEE,
            must_change_password=True,
        )
        db.add(user)
        await db.flush()  # Populates user.id without committing

        employee = Employee(
            user_id=user.id,
            employee_code=employee_code,
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
            address=data.address,
            date_of_birth=data.date_of_birth,
            date_of_joining=data.date_of_joining,
            department=data.department,
            job_position=data.job_position,
            company=data.company,
            location=data.location,
            manager=data.manager,
            personal_email=data.personal_email,
            gender=data.gender,
            nationality=data.nationality,
            marital_status=data.marital_status,
            bank_name=data.bank_name,
            account_number=data.account_number,
            ifsc_code=data.ifsc_code,
            pan=data.pan,
            uan=data.uan,
            about_text=data.about_text,
            job_love_text=data.job_love_text,
            hobbies_text=data.hobbies_text,
            skills=data.skills,
            certifications=data.certifications,
        )
        db.add(employee)
        await db.commit()
        await db.refresh(employee)
    except Exception as e:
        await db.rollback()
        logger.error(
            "Failed to complete employee creation, transaction rolled back. Error: %s",
            e,
        )
        raise e

    logger.info(
        "Employee created  employee_code=%s  user_id=%s  email=%s",
        employee_code,
        user.id,
        data.email,
    )

    # Enqueue credential email job AFTER successful DB commit
    try:
        await enqueue_send_credentials_job(
            to_email=data.email,
            first_name=data.first_name,
            login_id=login_id,
            temporary_password=temp_password,
        )
    except Exception as e:
        logger.error(
            "Failed to enqueue credential email for employee_code=%s: %s",
            employee_code,
            str(e),
            exc_info=True,
        )

    # Populate email in schema
    emp_out = EmployeeAdminOut.model_validate(employee)
    emp_out.email = data.email
    return EmployeeCreatedOut(
        employee=emp_out,
        login_id=login_id,
        temporary_password=temp_password,
    )


async def get_employee_by_id(db: AsyncSession, employee_id: int) -> Employee:
    result = await db.execute(
        select(Employee)
        .where(Employee.id == employee_id)
        .options(selectinload(Employee.user))
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise NotFoundError(f"Employee {employee_id} not found")
    return emp


async def get_employee_by_user_id(db: AsyncSession, user_id: int) -> Employee:
    result = await db.execute(
        select(Employee)
        .where(Employee.user_id == user_id)
        .options(selectinload(Employee.user))
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise NotFoundError("Employee profile not found for this user")
    return emp


async def list_employees(db: AsyncSession) -> list[Employee]:
    result = await db.execute(
        select(Employee)
        .order_by(Employee.employee_code)
        .options(selectinload(Employee.user))
    )
    return list(result.scalars().all())


async def admin_update_employee(
    db: AsyncSession,
    employee_id: int,
    data: EmployeeUpdate,
) -> Employee:
    emp = await get_employee_by_id(db, employee_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    logger.info("Employee updated by admin/hr  employee_id=%s", employee_id)
    return emp


async def self_update_employee(
    db: AsyncSession,
    user_id: int,
    data: EmployeeSelfUpdate,
) -> Employee:
    emp = await get_employee_by_user_id(db, user_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    logger.info("Employee self-updated  employee_id=%s", emp.id)
    return emp


async def require_own_or_admin(
    requesting_user: User,
    target_employee: Employee,
) -> None:
    """Raise ForbiddenError if a non-privileged user tries to access another employee's data.
    ADMIN and HR_OFFICER have unrestricted access to employee profiles.
    """
    if requesting_user.role in (UserRole.ADMIN, UserRole.HR_OFFICER):
        return
    if target_employee.user_id != requesting_user.id:
        raise ForbiddenError(
            "You do not have permission to access this employee's data"
        )
