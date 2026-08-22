"""Async SQLAlchemy engine and session factory.

All models must be imported here (even if unused) so that Base.metadata is
populated before Alembic runs autogenerate.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# ── Model imports for metadata registration ────────────────────────────────
from app.models.company import Company  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.employee import Employee  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.attendance import Attendance  # noqa: F401
from app.models.leave import LeaveRequest  # noqa: F401
from app.models.salary import SalaryStructure  # noqa: F401

# ── Engine ─────────────────────────────────────────────────────────────────
async_engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    """FastAPI dependency that yields a database session.

    References the module-level AsyncSessionLocal so that tests can
    monkeypatch it to a NullPool variant without cross-loop asyncpg errors.
    """
    import app.db.session as _self
    async with _self.AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
