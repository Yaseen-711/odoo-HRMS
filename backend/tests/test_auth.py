"""Tests for authentication and authorization business invariants."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_valid(client: AsyncClient, admin_credentials: dict, admin_token: str):
    """Valid credentials return a token."""
    assert admin_token  # fixture already validates this
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "ADMIN"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, admin_credentials: dict):
    """Wrong password returns 401."""
    resp = await client.post("/api/auth/login", json={
        "login_id": admin_credentials["login_id"],
        "password": "WrongPassword!",
    })
    assert resp.status_code == 401
    assert "hashed_password" not in resp.text


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Non-existent login_id returns 401, not 404."""
    resp = await client.post("/api/auth/login", json={
        "login_id": "GHOST-9999",
        "password": "anything",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient):
    """Accessing a protected endpoint without a token returns 401."""
    resp = await client.get("/api/employees")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_invalid_token(client: AsyncClient):
    """An invalid token returns 401."""
    resp = await client.get(
        "/api/employees",
        headers={"Authorization": "Bearer totally.invalid.token"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, created_employee: dict, employee_token: str):
    """Employee can change their password; subsequent login with new password works."""
    resp = await client.post(
        "/api/auth/change-password",
        json={
            "current_password": created_employee["temporary_password"],
            "new_password": "FreshSecure@789",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 204

    # Log in with new password
    resp2 = await client.post("/api/auth/login", json={
        "login_id": created_employee["login_id"],
        "password": "FreshSecure@789",
    })
    assert resp2.status_code == 200

    # Old password no longer works
    resp3 = await client.post("/api/auth/login", json={
        "login_id": created_employee["login_id"],
        "password": created_employee["temporary_password"],
    })
    assert resp3.status_code == 401


@pytest.mark.asyncio
async def test_change_password_same_as_current(client: AsyncClient, created_employee, employee_token):
    """Changing to the same password is rejected."""
    resp = await client.post(
        "/api/auth/change-password",
        json={
            "current_password": created_employee["temporary_password"],
            "new_password": created_employee["temporary_password"],
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 409
