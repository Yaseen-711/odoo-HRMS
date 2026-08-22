"""Dashboard API router — unified summary for the landing page."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_employee
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import AdminDashboardOut, DashboardSummaryOut
from app.services import dashboard_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    summary="Unified dashboard summary for the logged-in user",
)
async def get_dashboard_summary(
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummaryOut | AdminDashboardOut:
    """
    Returns a role-appropriate dashboard payload.

    **EMPLOYEE** → personal snapshot:
    - Employee identity (name, department, position)
    - Today's attendance (check-in/out times, work hours)
    - Leave request counts (pending / approved / rejected)
    - Payroll overview (salary structure existence + net salary)

    **ADMIN / HR_OFFICER** → administrative aggregate view:
    - Total employee count
    - Today's check-in / check-out counts
    - Pending leave requests count

    ADMIN and HR_OFFICER users do not necessarily have an Employee record and
    must not call the employee-centric summary endpoint.
    """
    return await dashboard_service.get_summary(db, current_user)
