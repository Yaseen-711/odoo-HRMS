"""Tests for employee management business invariants."""

import asyncio
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.employee import Employee
from app.models.user import User


@pytest.mark.asyncio
async def test_admin_can_create_employee(client: AsyncClient, admin_token: str):
    """Admin successfully creates employee; response includes login_id, temp password, PAN/UAN."""
    import uuid
    unique = uuid.uuid4().hex[:6]
    resp = await client.post(
        "/api/employees",
        json={
            "first_name": "Alice",
            "last_name": "Smith",
            "email": f"alice-{unique}@test.com",
            "pan": "ABCDE1234F",
            "uan": "100020003000",
            "bank_name": "Test Bank",
            "account_number": "999888777",
            "ifsc_code": "TEST0001",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "login_id" in data
    assert "temporary_password" in data
    assert data["login_id"].startswith("OIALSM")
    assert len(data["temporary_password"]) >= 10

    # Check that returned employee has the details
    emp = data["employee"]
    assert emp["first_name"] == "Alice"
    assert emp["last_name"] == "Smith"
    assert emp["pan"] == "ABCDE1234F"
    assert emp["uan"] == "100020003000"
    assert emp["bank_name"] == "Test Bank"
    assert emp["account_number"] == "999888777"
    assert emp["ifsc_code"] == "TEST0001"


@pytest.mark.asyncio
async def test_hr_can_create_employee(client: AsyncClient, hr_token: str):
    """HR Officer successfully creates employee."""
    import uuid
    unique = uuid.uuid4().hex[:6]
    resp = await client.post(
        "/api/employees",
        json={
            "first_name": "Bob",
            "last_name": "Miller",
            "email": f"bob-{unique}@test.com",
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["login_id"].startswith("OIBOMI")


@pytest.mark.asyncio
async def test_employee_cannot_create_employee(
    client: AsyncClient, employee_token: str
):
    """An employee trying to create another employee is forbidden."""
    resp = await client.post(
        "/api/employees",
        json={
            "first_name": "Evil",
            "last_name": "Twin",
            "email": "evil@test.com",
        },
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_duplicate_email_rejected(
    client: AsyncClient, admin_token: str, hr_token: str
):
    """Creating an employee with a duplicate email returns 409."""
    import uuid
    known_email = f"dup-{uuid.uuid4().hex[:6]}@test.com"

    # First creation
    r1 = await client.post(
        "/api/employees",
        json={"first_name": "A", "last_name": "B", "email": known_email},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r1.status_code == 201

    # Duplicate creation attempt by HR
    r2 = await client.post(
        "/api/employees",
        json={"first_name": "C", "last_name": "D", "email": known_email},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_login_id_format(client: AsyncClient, admin_token: str):
    """Verify login ID format: OI + first 2 first-name + first 2 last-name + year + serial."""
    import uuid
    unique = uuid.uuid4().hex[:6]
    resp = await client.post(
        "/api/employees",
        json={
            "first_name": "Jonathan",
            "last_name": "Doe",
            "email": f"jdoe-{unique}@test.com",
            "date_of_joining": "2026-08-22",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    login_id = data["login_id"]
    assert login_id.startswith("OIJODO2026")
    # OI(2) + JO(2) + DO(2) + 2026(4) + serial(4) = 14 chars
    assert len(login_id) == 14


@pytest.mark.asyncio
async def test_generated_login_id_is_unique(client: AsyncClient, admin_token: str):
    """Two different employees with same initials get unique serial numbers."""
    import uuid
    email1 = f"x1-{uuid.uuid4().hex[:6]}@t.com"
    email2 = f"x2-{uuid.uuid4().hex[:6]}@t.com"
    r1 = await client.post(
        "/api/employees",
        json={
            "first_name": "Xavier",
            "last_name": "Xylophone",
            "email": email1,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    r2 = await client.post(
        "/api/employees",
        json={
            "first_name": "Xavier",
            "last_name": "Xylophone",
            "email": email2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r1.status_code == 201
    assert r2.status_code == 201
    login_id1 = r1.json()["login_id"]
    login_id2 = r2.json()["login_id"]
    assert login_id1 != login_id2
    assert login_id1[:-4] == login_id2[:-4]  # same initials and year
    assert (
        int(login_id1[-4:]) + 1 == int(login_id2[-4:])
        or int(login_id2[-4:]) + 1 == int(login_id1[-4:])
    )


@pytest.mark.asyncio
async def test_concurrent_login_id_generation(client: AsyncClient, admin_token: str):
    """Simulate concurrent registrations to verify database sequence safety."""
    import uuid

    async def create_emp(i: int):
        unique = uuid.uuid4().hex[:6]
        return await client.post(
            "/api/employees",
            json={
                "first_name": f"User{i}",
                "last_name": "Test",
                "email": f"user{i}-{unique}@test.com",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    responses = await asyncio.gather(*(create_emp(i) for i in range(5)))
    assert all(r.status_code == 201 for r in responses)
    login_ids = [r.json()["login_id"] for r in responses]
    # Check that all generated login IDs are unique
    assert len(set(login_ids)) == 5


@pytest.mark.asyncio
async def test_employee_can_view_own_profile(
    client: AsyncClient, employee_token: str
):
    """Employee can see their own profile with personal fields (DOB, address, bank info)."""
    resp = await client.get(
        "/api/employees/me",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "bank_name" in data
    assert "pan" in data


@pytest.mark.asyncio
async def test_hr_employee_access(
    client: AsyncClient, hr_token: str, created_employee: dict
):
    """HR Officer has access to view any employee's details (admin view)."""
    other_id = created_employee["employee"]["id"]
    resp = await client.get(
        f"/api/employees/{other_id}",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert resp.status_code == 200
    assert "bank_name" in resp.json()  # HR sees bank details


@pytest.mark.asyncio
async def test_employee_idor(
    client: AsyncClient, admin_token: str, employee_token: str
):
    """Employee cannot view another employee's profile."""
    # Create a second employee
    import uuid
    resp = await client.post(
        "/api/employees",
        json={
            "first_name": "Other",
            "last_name": "Guy",
            "email": f"other-{uuid.uuid4().hex[:6]}@t.com",
        },
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
async def test_employee_cannot_modify_another_employee(
    client: AsyncClient, admin_token: str, employee_token: str
):
    """Employee cannot update another employee's record."""
    import uuid
    resp = await client.post(
        "/api/employees",
        json={
            "first_name": "Other",
            "last_name": "Guy",
            "email": f"other-{uuid.uuid4().hex[:6]}@t.com",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    other_id = resp.json()["employee"]["id"]

    resp_patch = await client.patch(
        f"/api/employees/{other_id}",
        json={"department": "Security"},
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert resp_patch.status_code == 403


@pytest.mark.asyncio
async def test_atomic_rollback(
    client: AsyncClient, admin_token: str, test_db_session
):
    """Verify that if Employee record insert fails, User record is rolled back (atomic transaction)."""
    # Attempting to create an employee with duplicate employee_code
    import uuid
    unique1 = uuid.uuid4().hex[:6]
    unique2 = uuid.uuid4().hex[:6]
    dup_code = f"EMP-{uuid.uuid4().hex[:6]}"

    # 1. Create first employee with explicit code dup_code
    r1 = await client.post(
        "/api/employees",
        json={
            "first_name": "First",
            "last_name": "Emp",
            "email": f"first-{unique1}@test.com",
            "employee_code": dup_code,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r1.status_code == 201

    # 2. Try to create second employee with duplicate code dup_code
    # This will trigger a UniqueViolationError on the employee table when inserting the employee,
    # AFTER the user has been added and flushed.
    email_dup = f"second-{unique2}@test.com"
    r2 = await client.post(
        "/api/employees",
        json={
            "first_name": "Second",
            "last_name": "Emp",
            "email": email_dup,
            "employee_code": dup_code,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    # Should fail due to DB IntegrityError / Internal Error
    assert r2.status_code in (500, 409)

    # 3. Verify that the User record for `email_dup` was NOT created (rolled back completely)
    async with test_db_session() as db:
        user_check = await db.execute(
            select(User).where(User.email == email_dup)
        )
        assert user_check.scalar_one_or_none() is None


# ── Employee code lookup endpoint ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_employee_by_code(client: AsyncClient, admin_token: str):
    """GET /employees/code/{employee_code} resolves the business identifier.

    This endpoint was added to fix the 422 error caused by the frontend passing
    a string like 'EMP-0624' to the integer-typed /{employee_id} route.
    """
    import uuid
    unique = uuid.uuid4().hex[:6]
    create_resp = await client.post(
        "/api/employees",
        json={
            "first_name": "CodeLookup",
            "last_name": "Test",
            "email": f"code-lookup-{unique}@test.com",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_resp.status_code == 201
    emp_code = create_resp.json()["employee"]["employee_code"]

    # Lookup by employee_code should return 200
    resp = await client.get(
        f"/api/employees/code/{emp_code}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["employee_code"] == emp_code
    assert data["first_name"] == "CodeLookup"


@pytest.mark.asyncio
async def test_get_employee_by_code_not_found(client: AsyncClient, admin_token: str):
    """GET /employees/code/EMP-NONEXISTENT returns 404, not 422."""
    resp = await client.get(
        "/api/employees/code/EMP-NONEXISTENT",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_employee_by_int_id_still_works(client: AsyncClient, admin_token: str, created_employee: dict):
    """GET /employees/{id} (integer) still resolves correctly alongside the code route."""
    emp_id = created_employee["employee"]["id"]
    resp = await client.get(
        f"/api/employees/{emp_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == emp_id
