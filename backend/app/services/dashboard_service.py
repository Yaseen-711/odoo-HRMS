"""Dashboard service — read-only aggregation across existing tables.

V1 architecture notes:
- EMPLOYEE users have an Employee record and get a full personal dashboard.
- ADMIN / HR_OFFICER users may not have an Employee record.
  They get an administrative aggregate view instead of a personal employee snapshot.
"""

import logging
from datetime import date, datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.salary import SalaryStructure
from app.models.user import User, UserRole
from app.schemas.dashboard import (
    AdminDashboardOut,
    AdminStats,
    AttendanceSummary,
    DashboardSummaryOut,
    EmployeeSnapshot,
    LeaveSummary,
    PayrollSummary,
)
from app.services.employee_service import get_employee_by_user_id
from app.services.payroll_service import compute_salary_totals

logger = logging.getLogger(__name__)


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


async def get_summary(db: AsyncSession, current_user: User) -> DashboardSummaryOut | AdminDashboardOut:
    """
    Build a dashboard payload based on the user's role.

    EMPLOYEE → personal dashboard (attendance, leave, payroll).
    ADMIN / HR_OFFICER → administrative aggregate view (employee counts, leave counts).
    """
    if current_user.role in (UserRole.ADMIN, UserRole.HR_OFFICER):
        return await _get_admin_summary(db, current_user)
    return await _get_employee_summary(db, current_user)


async def _get_employee_summary(db: AsyncSession, current_user: User) -> DashboardSummaryOut:
    """Personal dashboard for logged-in employee."""

    # ── 1. Employee identity ───────────────────────────────────────────────
    employee = await get_employee_by_user_id(db, current_user.id)

    employee_snap = EmployeeSnapshot(
        employee_code=employee.employee_code,
        first_name=employee.first_name,
        last_name=employee.last_name,
        department=employee.department,
        job_position=employee.job_position,
        profile_picture=employee.profile_picture,
    )

    # ── 2. Today's attendance ──────────────────────────────────────────────
    today = _today_utc()
    att_result = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.employee_id == employee.id,
                Attendance.date == today,
            )
        )
    )
    att_record = att_result.scalar_one_or_none()

    if att_record is None:
        att_summary = AttendanceSummary(status="ABSENT")
    elif att_record.check_out is not None:
        att_summary = AttendanceSummary(
            status="CHECKED_OUT",
            check_in_time=att_record.check_in,
            check_out_time=att_record.check_out,
            work_hours=att_record.work_hours,
        )
    else:
        att_summary = AttendanceSummary(
            status="CHECKED_IN",
            check_in_time=att_record.check_in,
        )

    # ── 3. Leave request counts ────────────────────────────────────────────
    leave_counts_result = await db.execute(
        select(
            LeaveRequest.status,
            func.count(LeaveRequest.id),
        )
        .where(LeaveRequest.employee_id == employee.id)
        .group_by(LeaveRequest.status)
    )
    counts: dict[str, int] = {
        row[0].value: row[1] for row in leave_counts_result.all()
    }
    leave_summary = LeaveSummary(
        pending_count=counts.get("PENDING", 0),
        approved_count=counts.get("APPROVED", 0),
        rejected_count=counts.get("REJECTED", 0),
    )

    # ── 4. Payroll snapshot ────────────────────────────────────────────────
    salary_result = await db.execute(
        select(SalaryStructure).where(
            SalaryStructure.employee_id == employee.id
        )
    )
    salary_record = salary_result.scalar_one_or_none()

    if salary_record:
        computed = compute_salary_totals(salary_record)
        payroll_summary = PayrollSummary(
            has_salary_structure=True,
            net_salary=computed.net_salary,
        )
    else:
        payroll_summary = PayrollSummary(has_salary_structure=False)

    logger.info(
        "Dashboard summary built  user_id=%s  employee_code=%s",
        current_user.id,
        employee.employee_code,
    )

    return DashboardSummaryOut(
        employee=employee_snap,
        role=current_user.role.value,
        attendance=att_summary,
        leave=leave_summary,
        payroll=payroll_summary,
    )


async def _get_admin_summary(db: AsyncSession, current_user: User) -> AdminDashboardOut:
    """Aggregate administrative dashboard for ADMIN / HR_OFFICER users."""

    today = _today_utc()

    # Total employee count
    total_emp_result = await db.execute(select(func.count(Employee.id)))
    total_employees: int = total_emp_result.scalar_one() or 0

    # Employees checked in today
    checked_in_result = await db.execute(
        select(func.count(Attendance.id)).where(
            and_(
                Attendance.date == today,
                Attendance.check_in.is_not(None),
                Attendance.check_out.is_(None),
            )
        )
    )
    checked_in_today: int = checked_in_result.scalar_one() or 0

    # Employees who completed checkout today
    checked_out_result = await db.execute(
        select(func.count(Attendance.id)).where(
            and_(
                Attendance.date == today,
                Attendance.check_out.is_not(None),
            )
        )
    )
    checked_out_today: int = checked_out_result.scalar_one() or 0

    # Total pending leave requests
    pending_leaves_result = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.status == LeaveStatus.PENDING
        )
    )
    pending_leaves: int = pending_leaves_result.scalar_one() or 0

    logger.info(
        "Admin dashboard summary built  user_id=%s  role=%s",
        current_user.id,
        current_user.role.value,
    )

    return AdminDashboardOut(
        role=current_user.role.value,
        stats=AdminStats(
            total_employees=total_employees,
            checked_in_today=checked_in_today,
            checked_out_today=checked_out_today,
            pending_leave_requests=pending_leaves,
        ),
    )
