"""Attendance API router."""

import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_admin, require_employee
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.attendance import AttendanceOut
from app.services import attendance_service, employee_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post(
    "/check-in",
    response_model=AttendanceOut,
    status_code=201,
    summary="Employee check-in",
)
async def check_in(
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> AttendanceOut:
    employee = await employee_service.get_employee_by_user_id(db, current_user.id)
    record = await attendance_service.check_in(db, employee)
    return AttendanceOut.model_validate(record)


@router.post(
    "/check-out",
    response_model=AttendanceOut,
    summary="Employee check-out",
)
async def check_out(
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> AttendanceOut:
    employee = await employee_service.get_employee_by_user_id(db, current_user.id)
    record = await attendance_service.check_out(db, employee)
    return AttendanceOut.model_validate(record)


@router.get(
    "/daily",
    response_model=AttendanceOut,
    summary="Get daily attendance for an employee",
)
async def daily_attendance(
    employee_id: int = Query(..., description="Employee record ID"),
    for_date: date = Query(default_factory=date.today),
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> AttendanceOut:
    # Non-admin: can only query their own data
    if current_user.role != UserRole.ADMIN:
        own_emp = await employee_service.get_employee_by_user_id(db, current_user.id)
        if own_emp.id != employee_id:
            from app.core.exceptions import ForbiddenError
            raise ForbiddenError("You can only view your own attendance")

    record = await attendance_service.get_daily_attendance(
        db, current_user, employee_id, for_date
    )
    return AttendanceOut.model_validate(record)


@router.get(
    "/weekly",
    response_model=list[AttendanceOut],
    summary="Get weekly attendance for an employee",
)
async def weekly_attendance(
    employee_id: int = Query(..., description="Employee record ID"),
    week_start: date = Query(..., description="ISO date of the week's Monday"),
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> list[AttendanceOut]:
    if current_user.role != UserRole.ADMIN:
        own_emp = await employee_service.get_employee_by_user_id(db, current_user.id)
        if own_emp.id != employee_id:
            from app.core.exceptions import ForbiddenError
            raise ForbiddenError("You can only view your own attendance")

    records = await attendance_service.get_weekly_attendance(
        db, current_user, employee_id, week_start
    )
    return [AttendanceOut.model_validate(r) for r in records]


@router.get(
    "",
    response_model=list[AttendanceOut],
    summary="[Admin] List all attendance records",
)
async def list_attendance(
    for_date: date | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AttendanceOut]:
    records = await attendance_service.list_all_attendance(db, for_date)
    return [AttendanceOut.model_validate(r) for r in records]


@router.get(
    "/export",
    summary="[Admin] Export Attendance Report as CSV",
)
async def export_attendance_csv(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    department: str | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generates a CSV report of attendance records."""
    import csv
    import io

    records = await attendance_service.list_all_attendance(db)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Employee ID", "Employee Code", "Check-In", "Check-Out", "Work Hours", "Status"])

    for r in records:
        # Filter by month/year if provided
        if month and r.date.month != month:
            continue
        if year and r.date.year != year:
            continue

        writer.writerow([
            r.date.isoformat(),
            r.employee_id,
            r.employee.employee_code if r.employee else f"EMP-{r.employee_id}",
            r.check_in.isoformat() if r.check_in else "",
            r.check_out.isoformat() if r.check_out else "",
            r.work_hours or 0.0,
            r.status.value if r.status else "",
        ])

    csv_data = output.getvalue()
    filename = f"attendance_report_{year or 'all'}_{month or 'all'}.csv"
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

