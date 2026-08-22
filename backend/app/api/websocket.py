"""WebSocket router for realtime dashboard updates."""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.models.employee import Employee
from app.models.user import User
from app.realtime.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not token:
        logger.warning("WebSocket connection rejected: missing token parameter")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(token)
    if not payload or not payload.get("user_id"):
        logger.warning("WebSocket connection rejected: invalid token payload")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload["user_id"]

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            logger.warning(
                "WebSocket connection rejected: user_id=%s not found or inactive", user_id
            )
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        emp_result = await db.execute(
            select(Employee).where(Employee.user_id == user.id)
        )
        emp = emp_result.scalar_one_or_none()
        employee_id = emp.id if emp else None

    await manager.connect(websocket, user, employee_id)

    try:
        while True:
            # Maintain active connection stream
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning("WebSocket connection closed for user_id=%s: %s", user.id, str(e))
        manager.disconnect(websocket)
