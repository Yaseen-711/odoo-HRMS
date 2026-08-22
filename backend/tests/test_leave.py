"""Tests for leave request business invariants."""

import pytest
from httpx import AsyncClient


async def _submit_leave(client, token, start="2027-10-01", end="2027-10-03"):
    return await client.post(
        "/api/leave",
        json={"leave_type": "PAID", "start_date": start, "end_date": end},
        headers={"Authorization": f"Bearer {token}"},
    )


@pytest.mark.asyncio
async def test_employee_can_create_leave(client: AsyncClient, employee_token: str):
    resp = await _submit_leave(client, employee_token)
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["leave_type"] == "PAID"


@pytest.mark.asyncio
async def test_invalid_date_range_rejected(client: AsyncClient, employee_token: str):
    """end_date before start_date must be rejected at schema level."""
    resp = await client.post(
        "/api/leave",
        json={"leave_type": "SICK", "start_date": "2027-11-05", "end_date": "2027-11-01"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_admin_approves_leave(client: AsyncClient, admin_token: str, employee_token: str):
    leave_resp = await _submit_leave(client, employee_token, "2027-12-01", "2027-12-05")
    leave_id = leave_resp.json()["id"]

    decision = await client.patch(
        f"/api/leave/{leave_id}/decide",
        json={"status": "APPROVED", "approval_comment": "Enjoy!"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert decision.status_code == 200
    data = decision.json()
    assert data["status"] == "APPROVED"
    assert data["approval_comment"] == "Enjoy!"


@pytest.mark.asyncio
async def test_admin_rejects_leave(client: AsyncClient, admin_token: str, employee_token: str):
    leave_resp = await _submit_leave(client, employee_token, "2028-01-10", "2028-01-12")
    leave_id = leave_resp.json()["id"]

    decision = await client.patch(
        f"/api/leave/{leave_id}/decide",
        json={"status": "REJECTED", "approval_comment": "Staffing conflict"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert decision.status_code == 200
    assert decision.json()["status"] == "REJECTED"


@pytest.mark.asyncio
async def test_cannot_change_already_decided_leave(
    client: AsyncClient, admin_token: str, employee_token: str
):
    """State transition PENDING→APPROVED→REJECTED must be rejected."""
    leave_resp = await _submit_leave(client, employee_token, "2028-03-01", "2028-03-03")
    leave_id = leave_resp.json()["id"]

    await client.patch(
        f"/api/leave/{leave_id}/decide",
        json={"status": "APPROVED"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Try to change again
    re_decide = await client.patch(
        f"/api/leave/{leave_id}/decide",
        json={"status": "REJECTED"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert re_decide.status_code == 409


@pytest.mark.asyncio
async def test_employee_cannot_approve_leave(client: AsyncClient, employee_token: str):
    """Employee cannot approve any leave request."""
    leave_resp = await _submit_leave(client, employee_token, "2028-05-01", "2028-05-02")
    leave_id = leave_resp.json()["id"]

    resp = await client.patch(
        f"/api/leave/{leave_id}/decide",
        json={"status": "APPROVED"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_employee_cannot_see_other_employee_leave(
    client: AsyncClient, admin_token: str, employee_token: str
):
    """Employee A cannot see Employee B's leave request."""
    import uuid
    emp2 = await client.post(
        "/api/employees",
        json={"first_name": "B", "last_name": "Employee",
              "email": f"b-{uuid.uuid4().hex[:6]}@t.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    tok2 = (await client.post("/api/auth/login", json={
        "login_id": emp2.json()["login_id"],
        "password": emp2.json()["temporary_password"],
    })).json()["access_token"]

    # Employee B submits a leave
    lr = await _submit_leave(client, tok2, "2028-07-01", "2028-07-03")
    leave_id = lr.json()["id"]

    # Employee A tries to view it
    view = await client.get(
        f"/api/leave/{leave_id}",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert view.status_code == 403


@pytest.mark.asyncio
async def test_overlapping_leave_rejected(client: AsyncClient, employee_token: str):
    """Submitting overlapping leave dates on an existing PENDING/APPROVED request fails."""
    await _submit_leave(client, employee_token, "2029-02-01", "2029-02-10")
    resp = await _submit_leave(client, employee_token, "2029-02-05", "2029-02-08")
    assert resp.status_code == 409
