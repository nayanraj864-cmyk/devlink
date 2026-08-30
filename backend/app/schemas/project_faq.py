from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.project_faq import FaqCategory


class FaqEntryCreate(BaseModel):
    question: str = Field(..., min_length=5, max_length=300)
    answer: str = Field(..., min_length=1)
    category: FaqCategory = FaqCategory.GENERAL
    is_pinned: bool = False


class FaqEntryUpdate(BaseModel):
    question: Optional[str] = Field(default=None, min_length=5, max_length=300)
    answer: Optional[str] = Field(default=None, min_length=1)
    category: Optional[FaqCategory] = None
    is_pinned: Optional[bool] = None
    is_accepted: Optional[bool] = None
    sort_order: Optional[int] = None


class FaqEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    author_id: uuid.UUID
    question: str
    answer: str
    category: FaqCategory
    is_pinned: bool
    is_accepted: bool
    upvotes: int
    views: int
    sort_order: int
    created_at: datetime
    updated_at: datetime


class FaqEntryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    author_id: uuid.UUID
    question: str
    category: FaqCategory
    is_pinned: bool
    is_accepted: bool
    upvotes: int
    views: int
    created_at: datetime


class PaginatedFaq(BaseModel):
    items: list[FaqEntryBrief]
    total: int
    page: int
    limit: int
    pages: int


class FaqSearchResult(BaseModel):
    items: list[FaqEntryBrief]
    total: int
    query: str


class FaqStatsResponse(BaseModel):
    project_id: uuid.UUID
    total_entries: int
    accepted_count: int
    pinned_count: int
    total_upvotes: int
    by_category: dict[str, int]


class FaqBulkCreateRequest(BaseModel):
    entries: list[FaqEntryCreate] = Field(..., min_length=1, max_length=20)


class FaqBulkCreateResponse(BaseModel):
    created: int
    entry_ids: list[uuid.UUID]
