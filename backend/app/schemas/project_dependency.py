from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.project_dependency import DependencyScope, DependencyType


class DependencyCreate(BaseModel):
    target_project_id: uuid.UUID
    dependency_type: DependencyType = DependencyType.HARD
    scope: DependencyScope = DependencyScope.RUNTIME
    version_constraint: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class DependencyUpdate(BaseModel):
    dependency_type: Optional[DependencyType] = None
    scope: Optional[DependencyScope] = None
    version_constraint: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class DependencyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    source_project_id: uuid.UUID
    target_project_id: uuid.UUID
    dependency_type: DependencyType
    scope: DependencyScope
    version_constraint: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DependencyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    target_project_id: uuid.UUID
    dependency_type: DependencyType
    scope: DependencyScope
    version_constraint: Optional[str] = None
    created_at: datetime


class PaginatedDependencies(BaseModel):
    items: list[DependencyBrief]
    total: int
    page: int
    limit: int
    pages: int


class DependencyGraphResponse(BaseModel):
    project_id: uuid.UUID
    depends_on: list[DependencyBrief]
    depended_by: list[DependencyBrief]


class DependencyStatsResponse(BaseModel):
    project_id: uuid.UUID
    total_depends_on: int
    total_depended_by: int
    hard_count: int
    soft_count: int
    optional_count: int


class CyclicDependencyCheckResponse(BaseModel):
    has_cycle: bool
    cycle_path: list[uuid.UUID] | None = None


class BulkDependencyRequest(BaseModel):
    target_project_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=50)
    dependency_type: DependencyType = DependencyType.HARD
    scope: DependencyScope = DependencyScope.RUNTIME
