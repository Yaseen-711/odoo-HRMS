"""Tests for payroll business invariants."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_creates_salary_structure(
    client: AsyncClient, admin_token: str, created_employee: dict
):
    emp_id = created_employee["employee"]["id"]
    resp = await client.post(
        f"/api/payroll/{emp_id}",
        json={
            "basic_salary": 60000,
            "hra": 24000,
            "standard_allowance": 6000,
            "performance_bonus": 12000,
            "lta": 6000,
            "fixed_allowance": 4000,
            "professional_tax": 200,
            "pf": 7200,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["gross_salary"] == 60000 + 24000 + 6000 + 12000 + 6000 + 4000
    assert data["total_deductions"] == 200 + 7200
    assert data["net_salary"] == data["gross_salary"] - data["total_deductions"]


@pytest.mark.asyncio
async def test_salary_calculation_correctness(
    client: AsyncClient, admin_token: str, created_employee: dict
):
    """Gross / deductions / net must be correctly computed."""
    emp_id = created_employee["employee"]["id"]
    await client.post(
        f"/api/payroll/{emp_id}",
        json={
            "basic_salary": 50000,
            "hra": 10000,
            "standard_allowance": 5000,
            "performance_bonus": 0,
            "lta": 0,
            "fixed_allowance": 0,
            "professional_tax": 200,
            "pf": 6000,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    resp = await client.get(
        f"/api/payroll/{emp_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    d = resp.json()
    assert d["gross_salary"] == 65000.0
    assert d["total_deductions"] == 6200.0
    assert d["net_salary"] == 58800.0


@pytest.mark.asyncio
async def test_employee_readonly_payroll(
    client: AsyncClient, admin_token: str, employee_token: str, created_employee: dict
):
    """Employee can read their own salary but cannot create or modify it."""
    emp_id = created_employee["employee"]["id"]

    # Admin creates the salary structure
    await client.post(
        f"/api/payroll/{emp_id}",
        json={"basic_salary": 40000},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Employee reads via /me
    read_resp = await client.get(
        "/api/payroll/me",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert read_resp.status_code == 200

    # Employee cannot create a new salary structure
    create_resp = await client.post(
        f"/api/payroll/{emp_id}",
        json={"basic_salary": 999999},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert create_resp.status_code == 403

    # Employee cannot update salary
    update_resp = await client.patch(
        f"/api/payroll/{emp_id}",
        json={"basic_salary": 999999},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert update_resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_update_salary(
    client: AsyncClient, admin_token: str, created_employee: dict
):
    emp_id = created_employee["employee"]["id"]
    await client.post(
        f"/api/payroll/{emp_id}",
        json={"basic_salary": 30000},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    resp = await client.patch(
        f"/api/payroll/{emp_id}",
        json={"basic_salary": 35000, "hra": 14000},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["basic_salary"] == 35000.0
    assert resp.json()["hra"] == 14000.0
