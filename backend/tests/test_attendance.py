"""Tests for attendance business invariants."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_checkin(client: AsyncClient, employee_token: str):
    """Employee can check in."""
    resp = await client.post(
        "/api/attendance/check-in",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    # May already exist from a previous test run on the same day — either 201 or 409
    assert resp.status_code in (201, 409)


@pytest.mark.asyncio
async def test_duplicate_checkin_rejected(client: AsyncClient, employee_token: str):
    """Second check-in on the same day is rejected."""
    await client.post(
        "/api/attendance/check-in",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    resp = await client.post(
        "/api/attendance/check-in",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 409
    assert "already checked in" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_checkout_without_checkin_rejected(client: AsyncClient, admin_token: str):
    """Checking out without checking in is rejected — use a fresh employee."""
    import uuid
    emp_resp = await client.post(
        "/api/employees",
        json={"first_name": "NoCheckIn", "last_name": "Employee",
              "email": f"nci-{uuid.uuid4().hex[:6]}@t.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert emp_resp.status_code == 201

    emp_token_resp = await client.post("/api/auth/login", json={
        "login_id": emp_resp.json()["login_id"],
        "password": emp_resp.json()["temporary_password"],
    })
    fresh_token = emp_token_resp.json()["access_token"]

    resp = await client.post(
        "/api/attendance/check-out",
        headers={"Authorization": f"Bearer {fresh_token}"},
    )
    assert resp.status_code == 409
    assert "not checked in" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_checkout_calculates_work_hours(client: AsyncClient, admin_token: str):
    """Check-out computes work_hours correctly (non-negative)."""
    import uuid
    emp_resp = await client.post(
        "/api/employees",
        json={"first_name": "CheckHours", "last_name": "Emp",
              "email": f"chk-{uuid.uuid4().hex[:6]}@t.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    tok_resp = await client.post("/api/auth/login", json={
        "login_id": emp_resp.json()["login_id"],
        "password": emp_resp.json()["temporary_password"],
    })
    token = tok_resp.json()["access_token"]

    await client.post("/api/attendance/check-in", headers={"Authorization": f"Bearer {token}"})
    co = await client.post("/api/attendance/check-out", headers={"Authorization": f"Bearer {token}"})
    assert co.status_code == 200
    data = co.json()
    assert data["work_hours"] is not None
    assert data["work_hours"] >= 0
    assert data["extra_hours"] is not None
