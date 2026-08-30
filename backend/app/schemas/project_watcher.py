from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.project_watcher import WatchNotificationLevel


class ProjectWatcherCreate(BaseModel):
    notification_level: WatchNotificationLevel = WatchNotificationLevel.ALL
    notes: Optional[str] = Field(default=None, max_length=500)


class ProjectWatcherUpdate(BaseModel):
    notification_level: Optional[WatchNotificationLevel] = None
    is_pinned: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class ProjectWatcherResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    project_id: uuid.UUID
    notification_level: WatchNotificationLevel
    is_pinned: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectWatcherBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    notification_level: WatchNotificationLevel
    is_pinned: bool
    created_at: datetime


class PaginatedWatchers(BaseModel):
    items: list[ProjectWatcherBrief]
    total: int
    page: int
    limit: int
    pages: int


class ProjectWatcherBulkRequest(BaseModel):
    project_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=50)
    watch: bool = True
    notification_level: WatchNotificationLevel = WatchNotificationLevel.ALL


class ProjectWatcherBulkResponse(BaseModel):
    watched: list[uuid.UUID]
    unwatched: list[uuid.UUID]


class ProjectWatcherStatsResponse(BaseModel):
    project_id: uuid.UUID
    total_watchers: int
    all_level_count: int
    major_level_count: int
    minimal_level_count: int
    pinned_count: int
