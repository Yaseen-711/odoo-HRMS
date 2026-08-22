"""Tests for employee management business invariants."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_can_create_employee(client: AsyncClient, admin_token: str):
    """Admin successfully creates employee; response includes login_id and temp password."""
    import uuid
    unique = uuid.uuid4().hex[:6]
    resp = await client.post(
        "/api/employees",
        json={
            "first_name": "Alice",
            "last_name": "Smith",
            "email": f"alice-{unique}@test.com",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "login_id" in data
    assert "temporary_password" in data
    assert data["login_id"].startswith("EMP-")
    assert len(data["temporary_password"]) >= 10


@pytest.mark.asyncio
async def test_employee_cannot_create_employee(client: AsyncClient, employee_token: str):
    """An employee trying to create another employee is forbidden."""
    resp = await client.post(
        "/api/employees",
        json={"first_name": "Evil", "last_name": "Twin", "email": "evil@test.com"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_duplicate_email_rejected(client: AsyncClient, admin_token: str, created_employee: dict):
    """Creating an employee with a duplicate email returns 409."""
    email = created_employee["employee"]["email"]
    # email is null because it comes from users table — use a fresh known email
    import uuid
    known_email = f"dup-{uuid.uuid4().hex[:6]}@test.com"

    # First creation
    r1 = await client.post(
        "/api/employees",
        json={"first_name": "A", "last_name": "B", "email": known_email},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r1.status_code == 201

    # Duplicate
    r2 = await client.post(
        "/api/employees",
        json={"first_name": "C", "last_name": "D", "email": known_email},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_generated_login_id_is_unique(client: AsyncClient, admin_token: str):
    """Two different employees get different login_ids."""
    import uuid
    r1 = await client.post(
        "/api/employees",
        json={"first_name": "X", "last_name": "1", "email": f"x1-{uuid.uuid4().hex[:6]}@t.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    r2 = await client.post(
        "/api/employees",
        json={"first_name": "X", "last_name": "2", "email": f"x2-{uuid.uuid4().hex[:6]}@t.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["login_id"] != r2.json()["login_id"]


@pytest.mark.asyncio
async def test_employee_can_view_own_profile(client: AsyncClient, employee_token: str):
    """Employee can see their own profile."""
    resp = await client.get(
        "/api/employees/me",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_employee_cannot_view_other_profile(
    client: AsyncClient, admin_token: str, employee_token: str
):
    """Employee cannot view another employee's profile."""
    # Create a second employee
    import uuid
    resp = await client.post(
        "/api/employees",
        json={"first_name": "Other", "last_name": "Guy", "email": f"other-{uuid.uuid4().hex[:6]}@t.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    other_id = resp.json()["employee"]["id"]

    # First employee tries to view the second employee
    view = await client.get(
        f"/api/employees/{other_id}",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert view.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_update_employee(
    client: AsyncClient, admin_token: str, created_employee: dict
):
    """Admin can update an employee's job details."""
    emp_id = created_employee["employee"]["id"]
    resp = await client.patch(
        f"/api/employees/{emp_id}",
        json={"department": "Leadership", "job_position": "Manager"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["department"] == "Leadership"
