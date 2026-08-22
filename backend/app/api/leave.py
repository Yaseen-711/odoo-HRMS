"""Leave request API router."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_admin, require_employee
from app.db.session import get_db
from app.models.leave import LeaveStatus
from app.models.user import User, UserRole
from app.schemas.leave import LeaveCreate, LeaveDecision, LeaveOut
from app.services import employee_service, leave_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leave", tags=["Leave"])


@router.post(
    "",
    response_model=LeaveOut,
    status_code=201,
    summary="Submit a leave request",
)
async def create_leave(
    data: LeaveCreate,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> LeaveOut:
    employee = await employee_service.get_employee_by_user_id(db, current_user.id)
    req = await leave_service.create_leave_request(db, employee, data)
    return LeaveOut.model_validate(req)


@router.get(
    "",
    response_model=list[LeaveOut],
    summary="List leave requests",
)
async def list_leave(
    employee_id: Optional[int] = Query(default=None, description="Filter by employee (admin only)"),
    status: Optional[LeaveStatus] = Query(default=None),
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> list[LeaveOut]:
    """
    - Admin: sees all requests; optionally filter by ``employee_id`` or ``status``.
    - Employee: sees only their own requests.
    """
    requests = await leave_service.list_leave_requests(
        db, current_user, employee_id, status
    )
    return [LeaveOut.model_validate(r) for r in requests]


@router.get(
    "/{leave_id}",
    response_model=LeaveOut,
    summary="Get leave request by ID",
)
async def get_leave(
    leave_id: int,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> LeaveOut:
    req = await leave_service.get_leave_request(db, leave_id)
    await leave_service.require_leave_access(current_user, req, db)
    return LeaveOut.model_validate(req)


@router.patch(
    "/{leave_id}/decide",
    response_model=LeaveOut,
    summary="[Admin] Approve or reject a leave request",
)
async def decide_leave(
    leave_id: int,
    decision: LeaveDecision,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> LeaveOut:
    req = await leave_service.decide_leave_request(db, leave_id, admin, decision)
    return LeaveOut.model_validate(req)
