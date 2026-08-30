"""add expires_at to project_members

Revision ID: e3f9a2b5d312
Revises: d2e8f1a4c131
Create Date: 2026-08-30

Stores the expiration timestamp for pending project invitations (#1312).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e3f9a2b5d312"
down_revision: Union[str, Sequence[str], None] = "d2e8f1a4c131"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "project_members",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("project_members", "expires_at")
