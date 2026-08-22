"""Pydantic schemas for realtime dashboard events."""

from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field


class DashboardEvent(BaseModel):
    """Realtime dashboard notification event payload."""

    event: str  # e.g., "attendance.updated", "leave.updated", "payroll.updated", "employee.updated"
    employee_id: Optional[int] = None
    user_id: Optional[int] = None
    status: Optional[str] = None
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    details: Optional[dict[str, Any]] = None
