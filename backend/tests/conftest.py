"""Pytest configuration for Dayflow HRMS.

The key challenge: asyncpg connections are loop-specific. The app uses a
connection pool tied to its engine's event loop. When pytest-asyncio creates
a new loop per test, pool_pre_ping fires against the old loop and raises
RuntimeError.

Solution: monkeypatch the app's AsyncSessionLocal to use a NullPool engine
(no connection reuse across requests) during tests.
"""

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.user import User, UserRole
import app.db.session as db_session_module


@pytest_asyncio.fixture(autouse=True)
async def test_db_session():
    """
    Replace the app's session factory with a NullPool-based one for each test.
    NullPool creates a fresh DB connection per request — no cross-loop reuse.
    """
    engine = create_async_engine(
        settings.async_database_url,
        poolclass=NullPool,
        echo=False,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    # Patch the module-level session factory used by get_db()
    original = db_session_module.AsyncSessionLocal
    db_session_module.AsyncSessionLocal = session_factory

    yield session_factory

    db_session_module.AsyncSessionLocal = original
    await engine.dispose()


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_credentials(test_db_session) -> dict:
    """Seed a fresh admin user using the test session factory."""
    unique = uuid.uuid4().hex[:8]
    login_id = f"ADMIN-TEST-{unique}"
    email = f"admin-{unique}@hrms-test.com"

    async with test_db_session() as db:
        user = User(
            login_id=login_id,
            email=email,
            hashed_password=hash_password("AdminPass@1"),
            role=UserRole.ADMIN,
            must_change_password=False,
            is_active=True,
        )
        db.add(user)
        await db.commit()

    return {"login_id": login_id, "password": "AdminPass@1"}


@pytest_asyncio.fixture
async def admin_token(client: AsyncClient, admin_credentials: dict) -> str:
    resp = await client.post("/api/auth/login", json=admin_credentials)
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def created_employee(client: AsyncClient, admin_token: str) -> dict:
    unique = uuid.uuid4().hex[:8]
    resp = await client.post(
        "/api/employees",
        json={
            "first_name": "Test",
            "last_name": "Employee",
            "email": f"emp-{unique}@hrms-test.com",
            "department": "QA",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest_asyncio.fixture
async def employee_token(client: AsyncClient, created_employee: dict) -> str:
    resp = await client.post("/api/auth/login", json={
        "login_id": created_employee["login_id"],
        "password": created_employee["temporary_password"],
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
