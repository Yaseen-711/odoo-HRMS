"""full_hrms_schema

Revision ID: 58a7bd69df63
Revises: 6e86f1b801dc
Create Date: 2026-08-22 09:32:43.193443

Uses raw SQL DDL to avoid SQLAlchemy's automatic PostgreSQL enum type creation
behaviour which conflicts with transactional DDL in Alembic.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58a7bd69df63'
down_revision: Union[str, Sequence[str], None] = '6e86f1b801dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()

    # ── 1. Create PostgreSQL enum types ─────────────────────────────────────
    conn.execute(sa.text(
        "CREATE TYPE userrole AS ENUM ('ADMIN', 'EMPLOYEE')"
    ))
    conn.execute(sa.text(
        "CREATE TYPE attendancestatus AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE')"
    ))
    conn.execute(sa.text(
        "CREATE TYPE leavetype AS ENUM ('PAID', 'SICK', 'UNPAID')"
    ))
    conn.execute(sa.text(
        "CREATE TYPE leavestatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED')"
    ))

    # ── 2. Alter existing users table ────────────────────────────────────────
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_users_id"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_users_username"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS username"))

    conn.execute(sa.text("ALTER TABLE users ADD COLUMN login_id VARCHAR(50)"))
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN role userrole"))
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN"))
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN is_active BOOLEAN"))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now()"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"
    ))

    # Back-fill defaults for any existing rows
    conn.execute(sa.text(
        "UPDATE users SET login_id = 'ADMIN-' || id::text WHERE login_id IS NULL"
    ))
    conn.execute(sa.text(
        "UPDATE users SET role = 'ADMIN' WHERE role IS NULL"
    ))
    conn.execute(sa.text(
        "UPDATE users SET must_change_password = FALSE WHERE must_change_password IS NULL"
    ))
    conn.execute(sa.text(
        "UPDATE users SET is_active = TRUE WHERE is_active IS NULL"
    ))

    # Make columns NOT NULL after back-fill
    conn.execute(sa.text("ALTER TABLE users ALTER COLUMN login_id SET NOT NULL"))
    conn.execute(sa.text("ALTER TABLE users ALTER COLUMN role SET NOT NULL"))
    conn.execute(sa.text("ALTER TABLE users ALTER COLUMN must_change_password SET NOT NULL"))
    conn.execute(sa.text("ALTER TABLE users ALTER COLUMN is_active SET NOT NULL"))

    conn.execute(sa.text(
        "CREATE UNIQUE INDEX ix_users_login_id ON users (login_id)"
    ))

    # ── 3. employees ─────────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE employees (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE
                REFERENCES users(id) ON DELETE CASCADE,
            employee_id VARCHAR(50) NOT NULL UNIQUE,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20),
            address TEXT,
            date_of_birth DATE,
            profile_picture VARCHAR(512),
            date_of_joining DATE,
            department VARCHAR(100),
            job_position VARCHAR(100),
            company VARCHAR(100),
            location VARCHAR(100),
            manager VARCHAR(100),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    conn.execute(sa.text(
        "CREATE UNIQUE INDEX ix_employees_employee_id ON employees (employee_id)"
    ))
    conn.execute(sa.text(
        "CREATE UNIQUE INDEX ix_employees_user_id ON employees (user_id)"
    ))

    # ── 4. attendance ────────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE attendance (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL
                REFERENCES employees(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            check_in TIMESTAMPTZ,
            check_out TIMESTAMPTZ,
            work_hours FLOAT,
            extra_hours FLOAT,
            status attendancestatus NOT NULL DEFAULT 'PRESENT',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, date)
        )
    """))
    conn.execute(sa.text(
        "CREATE INDEX ix_attendance_employee_id ON attendance (employee_id)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX ix_attendance_date ON attendance (date)"
    ))

    # ── 5. leave_requests ────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE leave_requests (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL
                REFERENCES employees(id) ON DELETE CASCADE,
            leave_type leavetype NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            remarks TEXT,
            status leavestatus NOT NULL DEFAULT 'PENDING',
            approved_by INTEGER,
            approval_comment VARCHAR(512),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    conn.execute(sa.text(
        "CREATE INDEX ix_leave_requests_employee_id ON leave_requests (employee_id)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX ix_leave_requests_status ON leave_requests (status)"
    ))

    # ── 6. salary_structures ─────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE salary_structures (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL UNIQUE
                REFERENCES employees(id) ON DELETE CASCADE,
            basic_salary FLOAT NOT NULL DEFAULT 0,
            hra FLOAT NOT NULL DEFAULT 0,
            standard_allowance FLOAT NOT NULL DEFAULT 0,
            performance_bonus FLOAT NOT NULL DEFAULT 0,
            lta FLOAT NOT NULL DEFAULT 0,
            fixed_allowance FLOAT NOT NULL DEFAULT 0,
            professional_tax FLOAT NOT NULL DEFAULT 0,
            pf FLOAT NOT NULL DEFAULT 0,
            effective_from DATE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    conn.execute(sa.text(
        "CREATE UNIQUE INDEX ix_salary_structures_employee_id ON salary_structures (employee_id)"
    ))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text("DROP TABLE IF EXISTS salary_structures CASCADE"))
    conn.execute(sa.text("DROP TABLE IF EXISTS leave_requests CASCADE"))
    conn.execute(sa.text("DROP TABLE IF EXISTS attendance CASCADE"))
    conn.execute(sa.text("DROP TABLE IF EXISTS employees CASCADE"))

    # Restore users table
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_users_login_id"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS updated_at"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS created_at"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS is_active"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS must_change_password"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS role"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS login_id"))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN username VARCHAR(50) NOT NULL DEFAULT 'migrated'"
    ))
    conn.execute(sa.text(
        "CREATE UNIQUE INDEX ix_users_username ON users (username)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX ix_users_id ON users (id)"
    ))

    # Drop enum types
    conn.execute(sa.text("DROP TYPE IF EXISTS leavestatus"))
    conn.execute(sa.text("DROP TYPE IF EXISTS leavetype"))
    conn.execute(sa.text("DROP TYPE IF EXISTS attendancestatus"))
    conn.execute(sa.text("DROP TYPE IF EXISTS userrole"))
