"""Payroll service — salary structure CRUD and computation.

All monetary calculations happen here, not in route handlers.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsError, NotFoundError
from app.events.publisher import publish_event
from app.models.salary import SalaryStructure
from app.schemas.payroll import SalaryOut, SalaryStructureCreate, SalaryStructureUpdate

logger = logging.getLogger(__name__)


def compute_salary_totals(s: SalaryStructure) -> SalaryOut:
    """
    Compute gross, deductions, and net salary from the stored components.

    Gross = all earnings components summed.
    Deductions = professional_tax + pf.
    Net = gross - deductions.
    """
    gross = (
        s.basic_salary
        + s.hra
        + s.standard_allowance
        + s.performance_bonus
        + s.lta
        + s.fixed_allowance
    )
    deductions = s.professional_tax + s.pf
    net = gross - deductions

    return SalaryOut(
        id=s.id,
        employee_id=s.employee_id,
        basic_salary=s.basic_salary,
        hra=s.hra,
        standard_allowance=s.standard_allowance,
        performance_bonus=s.performance_bonus,
        lta=s.lta,
        fixed_allowance=s.fixed_allowance,
        professional_tax=s.professional_tax,
        pf=s.pf,
        effective_from=s.effective_from,
        gross_salary=round(gross, 2),
        total_deductions=round(deductions, 2),
        net_salary=round(net, 2),
        updated_at=s.updated_at,
    )


async def get_salary_structure(db: AsyncSession, employee_id: int) -> SalaryStructure:
    result = await db.execute(
        select(SalaryStructure).where(SalaryStructure.employee_id == employee_id)
    )
    ss = result.scalar_one_or_none()
    if not ss:
        raise NotFoundError(f"No salary structure found for employee {employee_id}")
    return ss


async def create_salary_structure(
    db: AsyncSession,
    employee_id: int,
    data: SalaryStructureCreate,
) -> SalaryOut:
    existing = await db.execute(
        select(SalaryStructure).where(SalaryStructure.employee_id == employee_id)
    )
    if existing.scalar_one_or_none():
        raise AlreadyExistsError(
            f"Salary structure for employee {employee_id} already exists — use PATCH to update"
        )

    ss = SalaryStructure(
        employee_id=employee_id,
        **data.model_dump(exclude_none=True),
    )
    db.add(ss)
    await db.commit()
    await db.refresh(ss)
    logger.info("Salary structure created  employee_id=%s", employee_id)
    await publish_event(
        event_type="payroll.updated",
        employee_id=employee_id,
        status="CREATED",
    )
    return compute_salary_totals(ss)


async def update_salary_structure(
    db: AsyncSession,
    employee_id: int,
    data: SalaryStructureUpdate,
) -> SalaryOut:
    ss = await get_salary_structure(db, employee_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ss, field, value)
    db.add(ss)
    await db.commit()
    await db.refresh(ss)
    logger.info("Salary structure updated  employee_id=%s", employee_id)
    await publish_event(
        event_type="payroll.updated",
        employee_id=employee_id,
        status="UPDATED",
    )
    return compute_salary_totals(ss)


async def get_salary_out(db: AsyncSession, employee_id: int) -> SalaryOut:
    ss = await get_salary_structure(db, employee_id)
    return compute_salary_totals(ss)
