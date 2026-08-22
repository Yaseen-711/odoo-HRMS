"""Employee API router — onboarding and profile management."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_admin, require_employee
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeCreatedOut,
    EmployeeOut,
    EmployeeSelfUpdate,
    EmployeeUpdate,
)
from app.services import employee_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.post(
    "",
    response_model=EmployeeCreatedOut,
    status_code=201,
    summary="[Admin] Create a new employee",
)
async def create_employee(
    data: EmployeeCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EmployeeCreatedOut:
    """
    Admin creates an employee record.  The response includes the
    generated ``login_id`` and ``temporary_password`` which must be
    communicated securely to the employee.  These credentials are
    returned **only once**.
    """
    return await employee_service.create_employee(db, data)


@router.get(
    "",
    response_model=list[EmployeeOut],
    summary="[Admin] List all employees",
)
async def list_employees(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[EmployeeOut]:
    employees = await employee_service.list_employees(db)
    return [EmployeeOut.model_validate(e) for e in employees]


@router.get(
    "/me",
    response_model=EmployeeOut,
    summary="Get own employee profile",
)
async def get_own_profile(
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> EmployeeOut:
    emp = await employee_service.get_employee_by_user_id(db, current_user.id)
    return EmployeeOut.model_validate(emp)


@router.patch(
    "/me",
    response_model=EmployeeOut,
    summary="Update own permitted fields",
)
async def update_own_profile(
    data: EmployeeSelfUpdate,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> EmployeeOut:
    """
    Employee may update their own phone, address, and profile_picture only.
    Job fields are managed by Admin/HR.
    """
    emp = await employee_service.self_update_employee(db, current_user.id, data)
    return EmployeeOut.model_validate(emp)


@router.get(
    "/{employee_id}",
    response_model=EmployeeOut,
    summary="Get employee by ID",
)
async def get_employee(
    employee_id: int,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> EmployeeOut:
    emp = await employee_service.get_employee_by_id(db, employee_id)
    # Employee may only view their own record; admin may view any
    await employee_service.require_own_or_admin(current_user, emp)
    return EmployeeOut.model_validate(emp)


@router.patch(
    "/{employee_id}",
    response_model=EmployeeOut,
    summary="[Admin] Update employee record",
)
async def admin_update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EmployeeOut:
    emp = await employee_service.admin_update_employee(db, employee_id, data)
    return EmployeeOut.model_validate(emp)
