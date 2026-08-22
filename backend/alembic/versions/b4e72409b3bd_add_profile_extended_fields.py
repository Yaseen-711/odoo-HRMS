"""add_profile_extended_fields

Revision ID: b4e72409b3bd
Revises: 58a7bd69df63
Create Date: 2026-08-22 11:36:54.372800

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4e72409b3bd'
down_revision: Union[str, Sequence[str], None] = '58a7bd69df63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('employees', sa.Column('personal_email', sa.String(length=100), nullable=True))
    op.add_column('employees', sa.Column('gender', sa.String(length=50), nullable=True))
    op.add_column('employees', sa.Column('nationality', sa.String(length=100), nullable=True))
    op.add_column('employees', sa.Column('marital_status', sa.String(length=50), nullable=True))
    op.add_column('employees', sa.Column('bank_name', sa.String(length=100), nullable=True))
    op.add_column('employees', sa.Column('account_number', sa.String(length=100), nullable=True))
    op.add_column('employees', sa.Column('ifsc_code', sa.String(length=50), nullable=True))
    op.add_column('employees', sa.Column('about_text', sa.Text(), nullable=True))
    op.add_column('employees', sa.Column('job_love_text', sa.Text(), nullable=True))
    op.add_column('employees', sa.Column('hobbies_text', sa.Text(), nullable=True))
    op.add_column('employees', sa.Column('skills', sa.Text(), nullable=True))
    op.add_column('employees', sa.Column('certifications', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('employees', 'certifications')
    op.drop_column('employees', 'skills')
    op.drop_column('employees', 'hobbies_text')
    op.drop_column('employees', 'job_love_text')
    op.drop_column('employees', 'about_text')
    op.drop_column('employees', 'ifsc_code')
    op.drop_column('employees', 'account_number')
    op.drop_column('employees', 'bank_name')
    op.drop_column('employees', 'marital_status')
    op.drop_column('employees', 'nationality')
    op.drop_column('employees', 'gender')
    op.drop_column('employees', 'personal_email')
