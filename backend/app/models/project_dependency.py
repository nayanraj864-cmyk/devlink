from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class DependencyType(str, Enum):
    HARD = "hard"
    SOFT = "soft"
    OPTIONAL = "optional"


class DependencyScope(str, Enum):
    RUNTIME = "runtime"
    DEVELOPMENT = "development"
    BUILD = "build"


class ProjectDependency(Base):
    __tablename__ = "project_dependencies"

    __table_args__ = (
        UniqueConstraint("source_project_id", "target_project_id", name="uq_project_dep"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    source_project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    target_project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    dependency_type: Mapped[DependencyType] = mapped_column(
        SqlEnum(DependencyType), default=DependencyType.HARD, nullable=False)
    scope: Mapped[DependencyScope] = mapped_column(
        SqlEnum(DependencyScope), default=DependencyScope.RUNTIME, nullable=False)
    version_constraint: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)

    source_project = relationship("Project", foreign_keys=[source_project_id], backref="depends_on")
    target_project = relationship("Project", foreign_keys=[target_project_id], backref="depended_by")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<ProjectDependency({self.source_project_id} -> {self.target_project_id})>"
