"""Employee service — Admin-controlled onboarding and profile management."""

import logging
import secrets
import string

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsError, ForbiddenError, NotFoundError
from app.core.security import hash_password
from app.models.employee import Employee
from app.models.user import User, UserRole
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeCreatedOut,
    EmployeeOut,
    EmployeeSelfUpdate,
    EmployeeUpdate,
)

logger = logging.getLogger(__name__)

_PASSWORD_ALPHABET = string.ascii_letters + string.digits + "!@#$%"


def _generate_temp_password(length: int = 12) -> str:
    """Return a cryptographically random temporary password."""
    return "".join(secrets.choice(_PASSWORD_ALPHABET) for _ in range(length))


async def _next_employee_sequence(db: AsyncSession) -> int:
    """
    Return the next integer sequence number for employee ID generation.
    Uses a SELECT MAX + 1 inside the caller's transaction so that the unique
    constraint on employee_id and login_id provides the final safety net.
    """
    result = await db.execute(
        select(func.max(Employee.id))
    )
    max_id = result.scalar() or 0
    return max_id + 1


async def create_employee(
    db: AsyncSession,
    data: EmployeeCreate,
) -> EmployeeCreatedOut:
    """
    Admin creates a new employee.

    Steps:
    1. Check for duplicate email.
    2. Generate login_id and employee_id.
    3. Generate temporary password.
    4. Create User + Employee in a single transaction.
    5. Return the one-time credentials to the Admin.
    """
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise AlreadyExistsError(f"A user with email '{data.email}' already exists")

    temp_password = _generate_temp_password()

    # Determine the sequence number within this transaction
    seq = await _next_employee_sequence(db)
    employee_id = f"EMP-{seq:04d}"
    login_id = employee_id  # login_id mirrors employee_id for simplicity

    # Verify uniqueness (protects against rare concurrent collision)
    dup_check = await db.execute(
        select(User).where(User.login_id == login_id)
    )
    if dup_check.scalar_one_or_none():
        # Increment once more and retry — extremely unlikely but safe
        seq += 1
        employee_id = f"EMP-{seq:04d}"
        login_id = employee_id

    user = User(
        login_id=login_id,
        email=data.email,
        hashed_password=hash_password(temp_password),
        role=UserRole.EMPLOYEE,
        must_change_password=True,
    )
    db.add(user)
    await db.flush()  # populates user.id without committing

    employee = Employee(
        user_id=user.id,
        employee_id=employee_id,
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
    )
    db.add(employee)
    await db.commit()
    await db.refresh(employee)

    logger.info(
        "Employee created  employee_id=%s  user_id=%s  email=%s",
        employee_id,
        user.id,
        data.email,
    )

    emp_out = EmployeeOut.model_validate(employee)
    emp_out.email = data.email  # type: ignore[assignment]
    return EmployeeCreatedOut(
        employee=emp_out,
        login_id=login_id,
        temporary_password=temp_password,
    )


async def get_employee_by_id(db: AsyncSession, employee_id: int) -> Employee:
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise NotFoundError(f"Employee {employee_id} not found")
    return emp


async def get_employee_by_user_id(db: AsyncSession, user_id: int) -> Employee:
    result = await db.execute(
        select(Employee).where(Employee.user_id == user_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise NotFoundError("Employee profile not found for this user")
    return emp


async def list_employees(db: AsyncSession) -> list[Employee]:
    result = await db.execute(select(Employee).order_by(Employee.employee_id))
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
    logger.info("Employee updated by admin  employee_id=%s", employee_id)
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
    """Raise ForbiddenError if a non-admin tries to access another employee's data."""
    if requesting_user.role == UserRole.ADMIN:
        return
    if target_employee.user_id != requesting_user.id:
        raise ForbiddenError("You do not have permission to access this employee's data")
