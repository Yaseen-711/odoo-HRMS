"""Dashboard API router — unified summary for the landing page."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_employee
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryOut
from app.services import dashboard_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryOut,
    summary="Unified dashboard summary for the logged-in employee",
)
async def get_dashboard_summary(
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummaryOut:
    """
    Returns a single payload containing:

    - **Employee snapshot** (name, department, position)
    - **Today's attendance** (check-in/out times, work hours)
    - **Leave request counts** (pending / approved / rejected)
    - **Payroll overview** (salary structure existence + net salary)

    Designed so the frontend can populate the entire dashboard with one API call.
    """
    return await dashboard_service.get_summary(db, current_user)
