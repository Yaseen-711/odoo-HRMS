"""add_hr_role_pan_uan_employee_code

Revision ID: 4ca419734430
Revises: b4e72409b3bd
Create Date: 2026-08-22 11:48:42.519560

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4ca419734430'
down_revision: Union[str, Sequence[str], None] = 'b4e72409b3bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Alter type userrole to add HR_OFFICER
    op.execute(sa.text("ALTER TYPE userrole ADD VALUE 'HR_OFFICER'"))

    # 2. Create the employee serial sequence
    op.execute(sa.text("CREATE SEQUENCE employee_serial_seq START WITH 1"))
    op.execute(sa.text("SELECT setval('employee_serial_seq', COALESCE((SELECT MAX(id) FROM employees), 0) + 1, false)"))

    # 3. Rename column employee_id to employee_code in employees
    op.execute(sa.text("ALTER TABLE employees RENAME COLUMN employee_id TO employee_code"))

    # 4. Rename index
    op.execute(sa.text("ALTER INDEX ix_employees_employee_id RENAME TO ix_employees_employee_code"))

    # 5. Add columns pan and uan
    op.execute(sa.text("ALTER TABLE employees ADD COLUMN pan VARCHAR(10) NULL"))
    op.execute(sa.text("ALTER TABLE employees ADD COLUMN uan VARCHAR(12) NULL"))


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Drop columns pan and uan
    op.execute(sa.text("ALTER TABLE employees DROP COLUMN IF EXISTS pan"))
    op.execute(sa.text("ALTER TABLE employees DROP COLUMN IF EXISTS uan"))

    # 2. Rename index back
    op.execute(sa.text("ALTER INDEX ix_employees_employee_code RENAME TO ix_employees_employee_id"))

    # 3. Rename column employee_code back to employee_id
    op.execute(sa.text("ALTER TABLE employees RENAME COLUMN employee_code TO employee_id"))

    # 4. Drop sequence
    op.execute(sa.text("DROP SEQUENCE IF EXISTS employee_serial_seq"))
