"""add builder discovery indexes and optimization

Revision ID: 1069a1b2c3d4
Revises: zzzz00000002
Create Date: 2026-08-29 19:30:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "1069a1b2c3d4"
down_revision: Union[str, Sequence[str], None] = "zzzz00000002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Composite & B-Tree indexes on users table for fast filtering
    op.create_index(
        "ix_users_open_to_work_active",
        "users",
        ["open_to_work", "is_active"],
        unique=False,
    )
    op.create_index(
        "ix_users_experience_level",
        "users",
        ["experience_level"],
        unique=False,
    )
    op.create_index(
        "ix_users_location",
        "users",
        ["location"],
        unique=False,
    )
    op.create_index(
        "ix_users_company",
        "users",
        ["company"],
        unique=False,
    )

    # 2. Composite indexes on user_skills for efficient skill join filtering
    op.create_index(
        "ix_user_skills_skill_user",
        "user_skills",
        ["skill_id", "user_id"],
        unique=False,
    )

    # 3. PostgreSQL GIN / trigram full text indexes if running on PostgreSQL
    bind = op.get_bind()
    if bind is not None and bind.dialect.name == "postgresql":
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_builder_search_gin ON users USING gin(
                to_tsvector('english',
                    coalesce(username, '') || ' ' ||
                    coalesce(first_name, '') || ' ' ||
                    coalesce(last_name, '') || ' ' ||
                    coalesce(role, '') || ' ' ||
                    coalesce(headline, '') || ' ' ||
                    coalesce(bio, '') || ' ' ||
                    coalesce(location, '') || ' ' ||
                    coalesce(company, '')
                )
            );
        """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind is not None and bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS idx_users_builder_search_gin;")

    op.drop_index("ix_user_skills_skill_user", table_name="user_skills")
    op.drop_index("ix_users_company", table_name="users")
    op.drop_index("ix_users_location", table_name="users")
    op.drop_index("ix_users_experience_level", table_name="users")
    op.drop_index("ix_users_open_to_work_active", table_name="users")
