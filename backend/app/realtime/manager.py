"""WebSocket Connection Manager for realtime event broadcasting."""

import json
import logging
from typing import NamedTuple

from fastapi import WebSocket

from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


class ConnectionInfo(NamedTuple):
    websocket: WebSocket
    user: User
    employee_id: int | None


class ConnectionManager:
    """
    In-memory WebSocket manager tracking connected clients and enforcing event-level isolation.
    Admin / HR officers receive all dashboard events.
    Employees receive only events where employee_id matches their own.
    """

    def __init__(self) -> None:
        self.active_connections: list[ConnectionInfo] = []

    async def connect(
        self, websocket: WebSocket, user: User, employee_id: int | None
    ) -> None:
        await websocket.accept()
        info = ConnectionInfo(websocket=websocket, user=user, employee_id=employee_id)
        self.active_connections.append(info)
        logger.info(
            "WebSocket connected  user_id=%s  role=%s  employee_id=%s  total_connections=%d",
            user.id,
            user.role,
            employee_id,
            len(self.active_connections),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections = [
            conn for conn in self.active_connections if conn.websocket != websocket
        ]
        logger.info(
            "WebSocket disconnected  total_connections=%d",
            len(self.active_connections),
        )

    async def broadcast_event(self, event_data: dict) -> None:
        """
        Deliver event payload to authorized clients only.
        """
        payload_str = json.dumps(event_data)
        target_employee_id = event_data.get("employee_id")

        disconnected: list[WebSocket] = []

        for conn in self.active_connections:
            # Authorization check: Admin and HR receive all events;
            # Employees receive events specific to their employee_id or global events.
            is_admin_or_hr = conn.user.role in (UserRole.ADMIN, UserRole.HR_OFFICER)
            is_own_event = (
                target_employee_id is None
                or (conn.employee_id is not None and conn.employee_id == target_employee_id)
            )

            if is_admin_or_hr or is_own_event:
                try:
                    await conn.websocket.send_text(payload_str)
                except Exception as e:
                    logger.warning(
                        "Error sending WebSocket message to user_id=%s: %s",
                        conn.user.id,
                        str(e),
                    )
                    disconnected.append(conn.websocket)

        for ws in disconnected:
            self.disconnect(ws)


# Global singleton instance for single-process V1 architecture
manager = ConnectionManager()
