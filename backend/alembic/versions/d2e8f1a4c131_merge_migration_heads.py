"""merge migration heads

Revision ID: d2e8f1a4c131
Revises: 398b2154b3d5, 43db8afe27e7, c3a9f18d5e72, e1d7c9a4b620, zzzz00000002
Create Date: 2026-08-30

The graph had five heads. This merge is a no-op so a later revision can add
``project_members.expires_at`` without leaving a sixth head.
"""

from typing import Sequence, Union

revision: str = "d2e8f1a4c131"
down_revision: Union[str, Sequence[str], None] = (
    "398b2154b3d5",
    "43db8afe27e7",
    "c3a9f18d5e72",
    "e1d7c9a4b620",
    "zzzz00000002",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: this revision only rejoins the graph."""


def downgrade() -> None:
    """No-op: see :func:`upgrade`."""
