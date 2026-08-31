"""merge multiple heads

Revision ID: 30a41d646a74
Revises: voice_intro_url_001
Create Date: 2026-08-15 16:30:20.880768

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "30a41d646a74"
down_revision: Union[str, Sequence[str], None] = "voice_intro_url_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
