"""Tests for dashboard summary endpoint.

These tests exercise the new GET /api/dashboard/summary route without
touching the database schema or modifying any existing test fixtures.
"""

import uuid

import pytest
from httpx import AsyncClient


# ── Employee dashboard ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dashboard_returns_200_for_employee(
    client: AsyncClient, employee_token: str
):
    """An authenticated employee receives a 200 with the expected top-level keys."""
    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "employee" in data
    assert "role" in data
    assert "attendance" in data
    assert "leave" in data
    assert "payroll" in data


@pytest.mark.asyncio
async def test_dashboard_employee_snapshot_fields(
    client: AsyncClient, employee_token: str
):
    """The employee snapshot contains identity fields."""
    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 200
    emp = resp.json()["employee"]
    assert "employee_code" in emp
    assert "first_name" in emp
    assert "last_name" in emp
    assert emp["employee_code"].startswith("EMP-")


@pytest.mark.asyncio
async def test_dashboard_role_is_employee(
    client: AsyncClient, employee_token: str
):
    """Role field must match the authenticated user's role."""
    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "EMPLOYEE"


# ── Admin dashboard ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dashboard_returns_404_for_admin_without_employee_profile(
    client: AsyncClient, admin_token: str
):
    """Admins can also access the dashboard endpoint.

    Note: admin_token comes from a User seeded with role=ADMIN, which does
    NOT have an Employee record by default. The service calls
    get_employee_by_user_id which raises NotFoundError → 404.
    This is correct behaviour — an admin without an employee profile
    should be told their employee profile is missing.
    """
    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    # Admin user created by conftest has no Employee row → 404
    assert resp.status_code == 404


# ── Attendance integration ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dashboard_attendance_absent_by_default(
    client: AsyncClient, admin_token: str
):
    """A freshly-created employee who hasn't checked in shows ABSENT."""
    unique = uuid.uuid4().hex[:6]
    emp_resp = await client.post(
        "/api/employees",
        json={
            "first_name": "DashAbs",
            "last_name": "Test",
            "email": f"dash-abs-{unique}@t.com",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert emp_resp.status_code == 201

    tok_resp = await client.post("/api/auth/login", json={
        "login_id": emp_resp.json()["login_id"],
        "password": emp_resp.json()["temporary_password"],
    })
    token = tok_resp.json()["access_token"]

    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["attendance"]["status"] == "ABSENT"
    assert resp.json()["attendance"]["check_in_time"] is None


@pytest.mark.asyncio
async def test_dashboard_attendance_after_checkin(
    client: AsyncClient, admin_token: str
):
    """After check-in, the dashboard shows CHECKED_IN with a timestamp."""
    unique = uuid.uuid4().hex[:6]
    emp_resp = await client.post(
        "/api/employees",
        json={
            "first_name": "DashIn",
            "last_name": "Test",
            "email": f"dash-in-{unique}@t.com",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert emp_resp.status_code == 201

    tok_resp = await client.post("/api/auth/login", json={
        "login_id": emp_resp.json()["login_id"],
        "password": emp_resp.json()["temporary_password"],
    })
    token = tok_resp.json()["access_token"]

    # Check in
    ci = await client.post(
        "/api/attendance/check-in",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ci.status_code == 201

    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    att = resp.json()["attendance"]
    assert att["status"] == "CHECKED_IN"
    assert att["check_in_time"] is not None
    assert att["check_out_time"] is None


@pytest.mark.asyncio
async def test_dashboard_attendance_after_checkout(
    client: AsyncClient, admin_token: str
):
    """After check-out, dashboard shows CHECKED_OUT with work hours."""
    unique = uuid.uuid4().hex[:6]
    emp_resp = await client.post(
        "/api/employees",
        json={
            "first_name": "DashOut",
            "last_name": "Test",
            "email": f"dash-out-{unique}@t.com",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert emp_resp.status_code == 201

    tok_resp = await client.post("/api/auth/login", json={
        "login_id": emp_resp.json()["login_id"],
        "password": emp_resp.json()["temporary_password"],
    })
    token = tok_resp.json()["access_token"]

    await client.post(
        "/api/attendance/check-in",
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        "/api/attendance/check-out",
        headers={"Authorization": f"Bearer {token}"},
    )

    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    att = resp.json()["attendance"]
    assert att["status"] == "CHECKED_OUT"
    assert att["check_in_time"] is not None
    assert att["check_out_time"] is not None
    assert att["work_hours"] is not None
    assert att["work_hours"] >= 0


# ── Leave integration ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dashboard_leave_counts(
    client: AsyncClient, admin_token: str
):
    """Leave counts reflect submitted and decided requests."""
    unique = uuid.uuid4().hex[:6]
    emp_resp = await client.post(
        "/api/employees",
        json={
            "first_name": "DashLeave",
            "last_name": "Test",
            "email": f"dash-lv-{unique}@t.com",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert emp_resp.status_code == 201

    tok_resp = await client.post("/api/auth/login", json={
        "login_id": emp_resp.json()["login_id"],
        "password": emp_resp.json()["temporary_password"],
    })
    token = tok_resp.json()["access_token"]

    # Submit two leave requests (non-overlapping dates)
    leave1 = await client.post(
        "/api/leave",
        json={"leave_type": "PAID", "start_date": "2029-03-01", "end_date": "2029-03-03"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert leave1.status_code == 201

    leave2 = await client.post(
        "/api/leave",
        json={"leave_type": "SICK", "start_date": "2029-04-10", "end_date": "2029-04-12"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert leave2.status_code == 201

    # Approve one
    await client.patch(
        f"/api/leave/{leave1.json()['id']}/decide",
        json={"status": "APPROVED", "approval_comment": "OK"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    leave = resp.json()["leave"]
    assert leave["pending_count"] >= 1
    assert leave["approved_count"] >= 1


# ── Payroll integration ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dashboard_payroll_no_structure(
    client: AsyncClient, employee_token: str
):
    """Employee with no salary structure shows has_salary_structure=false."""
    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 200
    pay = resp.json()["payroll"]
    assert pay["has_salary_structure"] is False
    assert pay["net_salary"] is None


@pytest.mark.asyncio
async def test_dashboard_payroll_with_structure(
    client: AsyncClient, admin_token: str, created_employee: dict
):
    """After salary structure is created, dashboard shows net salary."""
    emp_id = created_employee["employee"]["id"]

    # Create salary structure
    await client.post(
        f"/api/payroll/{emp_id}",
        json={
            "basic_salary": 50000,
            "hra": 10000,
            "standard_allowance": 5000,
            "pf": 3000,
            "professional_tax": 200,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Login as that employee
    tok_resp = await client.post("/api/auth/login", json={
        "login_id": created_employee["login_id"],
        "password": created_employee["temporary_password"],
    })
    emp_token = tok_resp.json()["access_token"]

    resp = await client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert resp.status_code == 200
    pay = resp.json()["payroll"]
    assert pay["has_salary_structure"] is True
    assert pay["net_salary"] is not None
    assert pay["net_salary"] > 0


# ── Auth guard ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dashboard_requires_auth(client: AsyncClient):
    """Unauthenticated requests are rejected."""
    resp = await client.get("/api/dashboard/summary")
    assert resp.status_code in (401, 403)
