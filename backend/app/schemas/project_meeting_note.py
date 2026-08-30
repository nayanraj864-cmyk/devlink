from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ActionItem(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    assignee_id: Optional[uuid.UUID] = None
    is_completed: bool = False


class MeetingNoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    summary: str = Field(..., min_length=1)
    meeting_date: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    attendees: list[uuid.UUID] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class MeetingNoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    summary: Optional[str] = Field(default=None, min_length=1)
    meeting_date: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    attendees: Optional[list[uuid.UUID]] = None
    action_items: Optional[list[ActionItem]] = None
    decisions: Optional[list[str]] = None
    tags: Optional[list[str]] = None


class MeetingNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    author_id: uuid.UUID
    title: str
    summary: str
    meeting_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    attendees: list | None = None
    action_items: list | None = None
    decisions: list | None = None
    tags: list | None = None
    created_at: datetime
    updated_at: datetime


class MeetingNoteBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    author_id: uuid.UUID
    title: str
    meeting_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    tags: list | None = None
    created_at: datetime


class PaginatedMeetingNotes(BaseModel):
    items: list[MeetingNoteBrief]
    total: int
    page: int
    limit: int
    pages: int


class MeetingNoteStatsResponse(BaseModel):
    project_id: uuid.UUID
    total_meetings: int
    total_action_items: int
    completed_action_items: int
    total_attendees_seen: int
    avg_duration_minutes: Optional[float] = None


class MeetingNoteSearchResult(BaseModel):
    items: list[MeetingNoteBrief]
    total: int
    query: str
