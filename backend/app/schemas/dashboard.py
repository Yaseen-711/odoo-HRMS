"""Dashboard Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AttendanceSummary(BaseModel):
    """Today's attendance snapshot for the logged-in employee."""

    status: str  # "ABSENT", "CHECKED_IN", "CHECKED_OUT"
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    work_hours: Optional[float] = None


class LeaveSummary(BaseModel):
    """Leave request counts for the logged-in employee."""

    pending_count: int
    approved_count: int
    rejected_count: int


class PayrollSummary(BaseModel):
    """Payroll overview for the logged-in employee."""

    has_salary_structure: bool
    net_salary: Optional[float] = None


class EmployeeSnapshot(BaseModel):
    """Quick-reference identity fields for the dashboard header."""

    employee_code: str
    first_name: str
    last_name: str
    department: Optional[str] = None
    job_position: Optional[str] = None
    profile_picture: Optional[str] = None


class DashboardSummaryOut(BaseModel):
    """Unified dashboard response for Employee users — one call powers the entire landing page."""

    employee: EmployeeSnapshot
    role: str
    attendance: AttendanceSummary
    leave: LeaveSummary
    payroll: PayrollSummary


class AdminStats(BaseModel):
    """Aggregate statistics for Admin/HR dashboard."""

    total_employees: int
    checked_in_today: int
    checked_out_today: int
    pending_leave_requests: int


class AdminDashboardOut(BaseModel):
    """Dashboard response for ADMIN and HR_OFFICER users who may not have an Employee record."""

    role: str
    stats: AdminStats
