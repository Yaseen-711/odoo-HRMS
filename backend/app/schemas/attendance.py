"""Attendance Pydantic schemas."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from app.models.attendance import AttendanceStatus


class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    work_hours: Optional[float] = None
    extra_hours: Optional[float] = None
    status: AttendanceStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AttendanceWeeklyOut(BaseModel):
    """Summary for a single day in a weekly view."""

    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    work_hours: Optional[float] = None
    status: AttendanceStatus
