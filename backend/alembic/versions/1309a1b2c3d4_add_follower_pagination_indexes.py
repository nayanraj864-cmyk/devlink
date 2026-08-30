"""add follower pagination indexes

Revision ID: 1309a1b2c3d4
Revises: zzzz00000001
Create Date: 2026-08-29 20:00:00.000000

"""

from typing import Sequence, Union
from alembic import op

revision: str = "1309a1b2c3d4"
down_revision: Union[str, Sequence[str], None] = "zzzz00000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_followers_following_created_at",
        "followers",
        ["following_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_followers_follower_created_at",
        "followers",
        ["follower_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_followers_follower_created_at", table_name="followers")
    op.drop_index("ix_followers_following_created_at", table_name="followers")
