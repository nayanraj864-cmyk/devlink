"""merge_multiple_heads

Revision ID: 03f37a77b632
Revises: 1003a1b2c3d4, 1db933f16507, 5bd097fa6f70, c17b9c709b6c, f482656172b6
Create Date: 2026-08-26 10:46:02.998079

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '03f37a77b632'
down_revision: Union[str, Sequence[str], None] = ('1003a1b2c3d4', '1db933f16507', '5bd097fa6f70', 'c17b9c709b6c', 'f482656172b6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
