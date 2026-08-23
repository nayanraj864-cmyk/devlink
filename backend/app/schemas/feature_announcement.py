from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.feature_announcement import AnnouncementCategory


class FeatureAnnouncementBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    summary: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    category: AnnouncementCategory = AnnouncementCategory.FEATURE
    version: Optional[str] = Field(None, max_length=50)
    badge_label: Optional[str] = Field(None, max_length=50)
    is_featured: bool = False
    is_published: bool = True
    published_at: Optional[datetime] = None


class FeatureAnnouncementCreate(FeatureAnnouncementBase):
    pass


class FeatureAnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    summary: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[AnnouncementCategory] = None
    version: Optional[str] = Field(None, max_length=50)
    badge_label: Optional[str] = Field(None, max_length=50)
    is_featured: Optional[bool] = None
    is_published: Optional[bool] = None
    published_at: Optional[datetime] = None


class FeatureAnnouncementAuthor(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    first_name: str
    last_name: str
    profile_image: Optional[str] = None


class FeatureAnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_by_id: uuid.UUID
    created_by: Optional[FeatureAnnouncementAuthor] = None
    title: str
    summary: str
    content: str
    category: AnnouncementCategory
    version: Optional[str] = None
    badge_label: Optional[str] = None
    is_featured: bool
    is_published: bool
    published_at: datetime
    created_at: datetime
    updated_at: datetime
    is_read: bool = False


class FeatureAnnouncementListResponse(BaseModel):
    items: list[FeatureAnnouncementResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    unread_count: int = 0
