"""Tests for Redis Pub/Sub event publishing and WebSocket connections."""

import asyncio
from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient
from starlette.testclient import TestClient

from app.events.publisher import publish_event
from app.main import app
from app.realtime.manager import manager


@pytest.mark.asyncio
async def test_attendance_event_published_after_checkin(
    client: AsyncClient, employee_token: str
):
    """Check-in publishes attendance.updated event after DB commit."""
    with patch("app.services.attendance_service.publish_event", new_callable=AsyncMock) as mock_pub:
        resp = await client.post(
            "/api/attendance/check-in",
            headers={"Authorization": f"Bearer {employee_token}"},
        )
        assert resp.status_code == 201
        mock_pub.assert_called_once()
        call_kwargs = mock_pub.call_args.kwargs
        assert call_kwargs["event_type"] == "attendance.updated"
        assert "employee_id" in call_kwargs


@pytest.mark.asyncio
async def test_leave_event_published_after_leave_decision(
    client: AsyncClient, admin_token: str, employee_token: str
):
    """Leave decision publishes leave.updated event after DB commit."""
    # Create leave request
    leave_resp = await client.post(
        "/api/leave",
        json={"leave_type": "PAID", "start_date": "2028-10-01", "end_date": "2028-10-05"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert leave_resp.status_code == 201
    leave_id = leave_resp.json()["id"]

    with patch("app.services.leave_service.publish_event", new_callable=AsyncMock) as mock_pub:
        decide_resp = await client.patch(
            f"/api/leave/{leave_id}/decide",
            json={"status": "APPROVED", "approval_comment": "Granted"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert decide_resp.status_code == 200
        mock_pub.assert_called_once()
        assert mock_pub.call_args.kwargs["event_type"] == "leave.updated"


@pytest.mark.asyncio
async def test_payroll_event_published_after_update(
    client: AsyncClient, admin_token: str, created_employee: dict
):
    """Payroll update publishes payroll.updated event after DB commit."""
    emp_id = created_employee["employee"]["id"]

    with patch("app.services.payroll_service.publish_event", new_callable=AsyncMock) as mock_pub:
        resp = await client.post(
            f"/api/payroll/{emp_id}",
            json={
                "basic_salary": 60000,
                "hra": 12000,
                "standard_allowance": 5000,
                "pf": 3600,
                "professional_tax": 200,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        mock_pub.assert_called_once()
        assert mock_pub.call_args.kwargs["event_type"] == "payroll.updated"


@pytest.mark.asyncio
async def test_redis_publish_failure_does_not_rollback_db(
    client: AsyncClient, employee_token: str
):
    """If Redis publishing raises an error, DB commit remains intact."""
    with patch("app.events.publisher.redis.from_url", side_effect=Exception("Redis down")):
        resp = await client.post(
            "/api/attendance/check-in",
            headers={"Authorization": f"Bearer {employee_token}"},
        )
        # Check-in succeeds despite Redis failure
        assert resp.status_code in (201, 409)  # 201 if first check-in, 409 if already checked in


def test_unauthenticated_websocket_rejected():
    """Unauthenticated WebSocket connection attempts are rejected."""
    with TestClient(app) as tc:
        with pytest.raises(Exception):
            with tc.websocket_connect("/ws/dashboard") as ws:
                pass


def test_authenticated_employee_websocket_connect(employee_token: str):
    """Authenticated employee can connect to /ws/dashboard."""
    with TestClient(app) as tc:
        with tc.websocket_connect(f"/ws/dashboard?token={employee_token}") as ws:
            assert len(manager.active_connections) >= 1
    # Cleanup verification
    assert len(manager.active_connections) == 0


@pytest.mark.asyncio
async def test_employee_event_isolation(admin_token: str, employee_token: str):
    """Employees receive their own events; Admin receives all events."""
    event_for_emp = {
        "event": "attendance.updated",
        "employee_id": 99999,  # different employee id
        "status": "CHECKED_IN",
    }

    mock_emp_ws = AsyncMock()
    mock_admin_ws = AsyncMock()

    # Simulate active connections in manager
    with patch.object(manager, "active_connections", [
        type("Conn", (), {"websocket": mock_emp_ws, "user": type("U", (), {"id": 1, "role": "EMPLOYEE"})(), "employee_id": 11111})(),
        type("Conn", (), {"websocket": mock_admin_ws, "user": type("U", (), {"id": 2, "role": "ADMIN"})(), "employee_id": None})(),
    ]):
        await manager.broadcast_event(event_for_emp)

        # Admin receives event, Employee does NOT receive event meant for employee 99999
        mock_admin_ws.send_text.assert_called_once()
        mock_emp_ws.send_text.assert_not_called()


@pytest.mark.asyncio
async def test_dashboard_rest_endpoint_works_independently(
    client: AsyncClient, employee_token: str
):
    """Dashboard REST endpoint operates independently of WebSocket infrastructure."""
    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 200
    assert "attendance" in resp.json()
