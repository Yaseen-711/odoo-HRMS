"""Employee API router — onboarding and profile management."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_admin_or_hr, require_employee
from app.db.session import get_db
from app.models.employee import Employee
from app.models.user import User, UserRole
from app.schemas.employee import (
    EmployeeAdminOut,
    EmployeeCreate,
    EmployeeCreatedOut,
    EmployeeOut,
    EmployeeSelfOut,
    EmployeeSelfUpdate,
    EmployeeUpdate,
)
from app.services import employee_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employees", tags=["Employees"])


def _to_public_out(emp: Employee) -> EmployeeOut:
    out = EmployeeOut.model_validate(emp)
    if emp.user:
        out.email = emp.user.email
    return out


def _to_self_out(emp: Employee) -> EmployeeSelfOut:
    out = EmployeeSelfOut.model_validate(emp)
    if emp.user:
        out.email = emp.user.email
    return out


def _to_admin_out(emp: Employee) -> EmployeeAdminOut:
    out = EmployeeAdminOut.model_validate(emp)
    if emp.user:
        out.email = emp.user.email
    return out


@router.post(
    "",
    response_model=EmployeeCreatedOut,
    status_code=201,
    summary="[Admin/HR] Create a new employee",
)
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
) -> EmployeeCreatedOut:
    """
    Admin/HR creates an employee record. The response includes the
    generated ``login_id`` and ``temporary_password`` which must be
    communicated securely to the employee. These credentials are
    returned **only once**.
    """
    return await employee_service.create_employee(db, data)


@router.get(
    "",
    response_model=list[EmployeeAdminOut],
    summary="[Admin/HR] List all employees",
)
async def list_employees(
    current_user: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
) -> list[EmployeeAdminOut]:
    employees = await employee_service.list_employees(db)
    return [_to_admin_out(e) for e in employees]


@router.get(
    "/me",
    response_model=EmployeeSelfOut,
    summary="Get own employee profile",
)
async def get_own_profile(
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> EmployeeSelfOut:
    emp = await employee_service.get_employee_by_user_id(db, current_user.id)
    return _to_self_out(emp)


@router.patch(
    "/me",
    response_model=EmployeeSelfOut,
    summary="Update own permitted fields",
)
async def update_own_profile(
    data: EmployeeSelfUpdate,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> EmployeeSelfOut:
    """
    Employee may update their own phone, address, and profile_picture only.
    Job fields and sensitive banking fields are managed by Admin/HR.
    """
    emp = await employee_service.self_update_employee(db, current_user.id, data)
    return _to_self_out(emp)


@router.get(
    "/code/{employee_code}",
    response_model=EmployeeAdminOut | EmployeeSelfOut | EmployeeOut,
    summary="Get employee by employee_code (e.g. EMP-0001)",
)
async def get_employee_by_code(
    employee_code: str,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> EmployeeAdminOut | EmployeeSelfOut | EmployeeOut:
    """
    Look up an employee by their business-facing employee_code identifier.
    This is the canonical public-facing identifier used by the frontend.
    """
    emp = await employee_service.get_employee_by_code(db, employee_code)
    await employee_service.require_own_or_admin(current_user, emp)

    if current_user.role in (UserRole.ADMIN, UserRole.HR_OFFICER):
        return _to_admin_out(emp)
    if emp.user_id == current_user.id:
        return _to_self_out(emp)
    return _to_public_out(emp)


@router.get(
    "/{employee_id}",
    response_model=EmployeeAdminOut | EmployeeSelfOut | EmployeeOut,
    summary="Get employee by numeric ID",
)
async def get_employee(
    employee_id: int,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> EmployeeAdminOut | EmployeeSelfOut | EmployeeOut:
    emp = await employee_service.get_employee_by_id(db, employee_id)
    # Check object-level authorization (Admin/HR can access all, Employee can access self)
    await employee_service.require_own_or_admin(current_user, emp)

    # Return different schema structures based on role and relationship
    if current_user.role in (UserRole.ADMIN, UserRole.HR_OFFICER):
        return _to_admin_out(emp)
    if emp.user_id == current_user.id:
        return _to_self_out(emp)
    return _to_public_out(emp)


@router.patch(
    "/{employee_id}",
    response_model=EmployeeAdminOut,
    summary="[Admin/HR] Update employee record",
)
async def admin_update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    current_user: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
) -> EmployeeAdminOut:
    emp = await employee_service.admin_update_employee(db, employee_id, data)
    return _to_admin_out(emp)
