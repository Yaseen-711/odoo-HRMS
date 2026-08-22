"""Leave request service — creation, listing, and Admin approval workflow."""

import logging
from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.employee import Employee
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.user import User, UserRole
from app.schemas.leave import LeaveCreate, LeaveDecision

logger = logging.getLogger(__name__)


async def create_leave_request(
    db: AsyncSession,
    employee: Employee,
    data: LeaveCreate,
) -> LeaveRequest:
    """Employee submits a leave request."""
    # Check for overlapping approved/pending leaves
    overlap = await db.execute(
        select(LeaveRequest).where(
            and_(
                LeaveRequest.employee_id == employee.id,
                LeaveRequest.status != LeaveStatus.REJECTED,
                LeaveRequest.start_date <= data.end_date,
                LeaveRequest.end_date >= data.start_date,
            )
        )
    )
    if overlap.scalar_one_or_none():
        raise ConflictError(
            "A leave request already exists that overlaps with the requested dates"
        )

    req = LeaveRequest(
        employee_id=employee.id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        remarks=data.remarks,
        status=LeaveStatus.PENDING,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    logger.info(
        "Leave request created  employee_id=%s  leave_id=%s  type=%s  dates=%s→%s",
        employee.id,
        req.id,
        data.leave_type,
        data.start_date,
        data.end_date,
    )
    return req


async def list_leave_requests(
    db: AsyncSession,
    requesting_user: User,
    employee_id: int | None = None,
    status: LeaveStatus | None = None,
) -> list[LeaveRequest]:
    """
    Admin: list all or filter by employee/status.
    Employee: list their own requests only.
    """
    stmt = select(LeaveRequest)

    if requesting_user.role != UserRole.ADMIN:
        # Resolve the employee record for this user
        emp_result = await db.execute(
            select(Employee).where(Employee.user_id == requesting_user.id)
        )
        emp = emp_result.scalar_one_or_none()
        if not emp:
            return []
        stmt = stmt.where(LeaveRequest.employee_id == emp.id)
    elif employee_id is not None:
        stmt = stmt.where(LeaveRequest.employee_id == employee_id)

    if status is not None:
        stmt = stmt.where(LeaveRequest.status == status)

    result = await db.execute(stmt.order_by(LeaveRequest.created_at.desc()))
    return list(result.scalars().all())


async def get_leave_request(db: AsyncSession, leave_id: int) -> LeaveRequest:
    result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.id == leave_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise NotFoundError(f"Leave request {leave_id} not found")
    return req


async def decide_leave_request(
    db: AsyncSession,
    leave_id: int,
    admin: User,
    decision: LeaveDecision,
) -> LeaveRequest:
    """Admin approves or rejects a leave request."""
    req = await get_leave_request(db, leave_id)

    if req.status != LeaveStatus.PENDING:
        raise ConflictError(
            f"Leave request is already in terminal state '{req.status.value}' — cannot change"
        )

    req.status = decision.status
    req.approved_by = admin.id
    req.approval_comment = decision.approval_comment
    db.add(req)
    await db.commit()
    await db.refresh(req)

    logger.info(
        "Leave request decided  leave_id=%s  status=%s  admin_id=%s",
        leave_id,
        decision.status,
        admin.id,
    )
    return req


async def require_leave_access(
    requesting_user: User,
    leave_request: LeaveRequest,
    db: AsyncSession,
) -> None:
    """Raise ForbiddenError if non-admin accesses another employee's leave."""
    if requesting_user.role == UserRole.ADMIN:
        return
    emp_result = await db.execute(
        select(Employee).where(Employee.user_id == requesting_user.id)
    )
    emp = emp_result.scalar_one_or_none()
    if not emp or emp.id != leave_request.employee_id:
        raise ForbiddenError("You do not have permission to access this leave request")
