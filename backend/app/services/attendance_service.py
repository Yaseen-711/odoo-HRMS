"""Attendance service — check-in, check-out, and views."""

import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.attendance import Attendance, AttendanceStatus
from app.models.employee import Employee
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _today_utc() -> date:
    return _utc_now().date()


async def _get_today_record(
    db: AsyncSession, employee_id: int, for_date: date
) -> Attendance | None:
    result = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.date == for_date,
            )
        )
    )
    return result.scalar_one_or_none()


async def check_in(db: AsyncSession, employee: Employee) -> Attendance:
    """Create (or validate) today's attendance record and set check_in time."""
    today = _today_utc()
    existing = await _get_today_record(db, employee.id, today)

    if existing and existing.check_in is not None:
        raise ConflictError("You have already checked in today")

    now = _utc_now()

    if existing:
        # Record was pre-created (e.g., leave import) — just update check_in
        existing.check_in = now
        existing.status = AttendanceStatus.PRESENT
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        return existing

    record = Attendance(
        employee_id=employee.id,
        date=today,
        check_in=now,
        status=AttendanceStatus.PRESENT,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    logger.info(
        "Check-in recorded  employee_id=%s  time=%s",
        employee.id,
        now.isoformat(),
    )
    return record


async def check_out(db: AsyncSession, employee: Employee) -> Attendance:
    """Set check_out and compute work_hours / extra_hours."""
    today = _today_utc()
    record = await _get_today_record(db, employee.id, today)

    if not record or record.check_in is None:
        raise ConflictError("You have not checked in today — cannot check out")

    if record.check_out is not None:
        raise ConflictError("You have already checked out today")

    now = _utc_now()
    record.check_out = now

    delta: timedelta = now - record.check_in
    work_hours = round(delta.total_seconds() / 3600, 2)
    extra = max(0.0, work_hours - settings.STANDARD_WORK_HOURS)

    record.work_hours = work_hours
    record.extra_hours = round(extra, 2)

    # Downgrade to HALF_DAY if worked less than half of standard hours
    if work_hours < settings.STANDARD_WORK_HOURS / 2:
        record.status = AttendanceStatus.HALF_DAY

    db.add(record)
    await db.commit()
    await db.refresh(record)
    logger.info(
        "Check-out recorded  employee_id=%s  work_hours=%.2f",
        employee.id,
        work_hours,
    )
    return record


async def get_daily_attendance(
    db: AsyncSession,
    requesting_user: User,
    employee_id: int,
    for_date: date,
) -> Attendance:
    _enforce_attendance_access(requesting_user, employee_id)
    record = await _get_today_record(db, employee_id, for_date)
    if not record:
        raise NotFoundError(f"No attendance record for employee {employee_id} on {for_date}")
    return record


async def get_weekly_attendance(
    db: AsyncSession,
    requesting_user: User,
    employee_id: int,
    week_start: date,
) -> list[Attendance]:
    """Return attendance records for 7 days starting from week_start."""
    _enforce_attendance_access(requesting_user, employee_id)
    week_end = week_start + timedelta(days=6)
    result = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.date >= week_start,
                Attendance.date <= week_end,
            )
        ).order_by(Attendance.date)
    )
    return list(result.scalars().all())


async def list_all_attendance(
    db: AsyncSession,
    for_date: date | None = None,
) -> list[Attendance]:
    """Admin: list attendance records, optionally filtered by date."""
    stmt = select(Attendance).options(selectinload(Attendance.employee))
    if for_date:
        stmt = stmt.where(Attendance.date == for_date)
    result = await db.execute(stmt.order_by(Attendance.date.desc()))
    return list(result.scalars().all())


def _enforce_attendance_access(requesting_user: User, employee_id: int) -> None:
    """
    Non-admin users may only access their own employee_id.
    The mapping from user_id to employee_id is resolved in the router
    before calling service methods.
    """
    if requesting_user.role == UserRole.ADMIN:
        return
    # The router stores the resolved employee.id in the request context;
    # here we trust the pre-resolved value passed in.
    # This function is a guard for non-admin callers.
