"""merge_multiple_heads

Revision ID: 5bd097fa6f70
Revises: f3a7b1c2d9e0
Create Date: 2026-08-26 10:36:16.221401

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bd097fa6f70'
down_revision: Union[str, Sequence[str], None] = 'f3a7b1c2d9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
