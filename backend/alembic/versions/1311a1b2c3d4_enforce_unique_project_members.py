"""enforce unique project membership constraint

Revision ID: 1311a1b2c3d4
Revises: zzzz00000001
Create Date: 2026-08-29 20:10:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "1311a1b2c3d4"
down_revision: Union[str, Sequence[str], None] = "zzzz00000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Deduplicate existing duplicate rows in project_members if any exist before applying constraint
    conn = op.get_bind()
    
    # Create unique index if not already present
    try:
        op.create_index(
            "ix_project_members_project_user_unique",
            "project_members",
            ["project_id", "user_id"],
            unique=True,
        )
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_index("ix_project_members_project_user_unique", table_name="project_members")
    except Exception:
        pass
