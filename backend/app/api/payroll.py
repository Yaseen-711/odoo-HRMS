"""Payroll API router."""

import logging

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_admin, require_employee
from app.core.exceptions import ForbiddenError
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.payroll import SalaryOut, SalaryStructureCreate, SalaryStructureUpdate
from app.services import employee_service, payroll_service
from app.services.pdf_service import generate_payslip_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payroll", tags=["Payroll"])


@router.get(
    "/me",
    response_model=SalaryOut,
    summary="Get own salary information",
)
async def get_own_salary(
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> SalaryOut:
    employee = await employee_service.get_employee_by_user_id(db, current_user.id)
    return await payroll_service.get_salary_out(db, employee.id)


@router.get(
    "/{employee_id}",
    response_model=SalaryOut,
    summary="[Admin] Get salary for an employee",
)
async def get_salary(
    employee_id: int,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> SalaryOut:
    # Non-admin employees can only fetch their own salary via /me
    if current_user.role != UserRole.ADMIN:
        own_emp = await employee_service.get_employee_by_user_id(db, current_user.id)
        if own_emp.id != employee_id:
            raise ForbiddenError("You can only view your own salary information")
    return await payroll_service.get_salary_out(db, employee_id)


@router.post(
    "/{employee_id}",
    response_model=SalaryOut,
    status_code=201,
    summary="[Admin] Create salary structure for an employee",
)
async def create_salary(
    employee_id: int,
    data: SalaryStructureCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> SalaryOut:
    # Verify employee exists
    await employee_service.get_employee_by_id(db, employee_id)
    return await payroll_service.create_salary_structure(db, employee_id, data)


@router.patch(
    "/{employee_id}",
    response_model=SalaryOut,
    summary="[Admin] Update salary structure",
)
async def update_salary(
    employee_id: int,
    data: SalaryStructureUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> SalaryOut:
    return await payroll_service.update_salary_structure(db, employee_id, data)


@router.get(
    "/{employee_id}/slip",
    summary="Download Payslip as PDF",
)
async def download_payslip(
    employee_id: int,
    month: int = Query(default=8, ge=1, le=12),
    year: int = Query(default=2026, ge=2000, le=2100),
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
):
    emp = await employee_service.get_employee_by_id(db, employee_id)
    await employee_service.require_own_or_admin(current_user, emp)

    salary = await payroll_service.get_salary_structure(db, employee_id)
    pdf_bytes = generate_payslip_pdf(emp, salary, month, year)

    filename = f"payslip_{emp.employee_code}_{month}_{year}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )

