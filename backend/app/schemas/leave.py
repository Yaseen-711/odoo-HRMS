"""Leave request Pydantic schemas."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, model_validator

from app.models.leave import LeaveStatus, LeaveType


class LeaveCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    remarks: Optional[str] = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "LeaveCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class LeaveDecision(BaseModel):
    """Used by Admin to approve or reject a leave request."""

    status: LeaveStatus  # must be APPROVED or REJECTED
    approval_comment: Optional[str] = None

    @model_validator(mode="after")
    def must_be_terminal_status(self) -> "LeaveDecision":
        if self.status == LeaveStatus.PENDING:
            raise ValueError("Decision status must be APPROVED or REJECTED, not PENDING")
        return self


class LeaveOut(BaseModel):
    id: int
    employee_id: int
    leave_type: LeaveType
    start_date: date
    end_date: date
    remarks: Optional[str] = None
    status: LeaveStatus
    approved_by: Optional[int] = None
    approval_comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
