"""merge_all_heads

Revision ID: e97619c62904
Revises: 03f37a77b632, 43db8afe27e7
Create Date: 2026-08-26 16:31:48.484017

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e97619c62904'
down_revision: Union[str, Sequence[str], None] = ('03f37a77b632', '43db8afe27e7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
