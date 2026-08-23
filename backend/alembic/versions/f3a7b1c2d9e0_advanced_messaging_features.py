"""advanced messaging features: scheduling, pinning, voice type

Revision ID: f3a7b1c2d9e0
Revises: zzzz00000001
Create Date: 2026-08-16 12:05:00.000000

Adds the schema needed for the advanced messaging features (issue #973):

  * ``messages.is_sent``      — scheduled messages are hidden until flushed
  * ``messages.scheduled_for`` — when a scheduled message should be delivered
  * ``messages.is_pinned``    — pin/unpin messages in a conversation
  * ``messages.pinned_by_id`` — who pinned the message
  * ``messages.pinned_at``    — when it was pinned

Existing rows get ``is_sent=true`` / ``is_pinned=false`` via server defaults,
so no data backfill is required.

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "f3a7b1c2d9e0"
down_revision: Union[str, Sequence[str], None] = "zzzz00000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column(
            "is_sent",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.create_index(op.f("ix_messages_is_sent"), "messages", ["is_sent"], unique=False)

    op.add_column(
        "messages",
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_messages_scheduled_for"), "messages", ["scheduled_for"], unique=False
    )

    op.add_column(
        "messages",
        sa.Column(
            "is_pinned",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.create_index(
        op.f("ix_messages_is_pinned"), "messages", ["is_pinned"], unique=False
    )

    op.add_column(
        "messages",
        sa.Column("pinned_by_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_messages_pinned_by_id_users",
        "messages",
        "users",
        ["pinned_by_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "messages",
        sa.Column("pinned_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("messages", "pinned_at")
    op.drop_constraint("fk_messages_pinned_by_id_users", "messages", type_="foreignkey")
    op.drop_column("messages", "pinned_by_id")
    op.drop_index(op.f("ix_messages_is_pinned"), table_name="messages")
    op.drop_column("messages", "is_pinned")
    op.drop_index(op.f("ix_messages_scheduled_for"), table_name="messages")
    op.drop_column("messages", "scheduled_for")
    op.drop_index(op.f("ix_messages_is_sent"), table_name="messages")
    op.drop_column("messages", "is_sent")
