from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.project_poll import PollStatus


class PollOptionCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=200)


class PollCreate(BaseModel):
    question: str = Field(..., min_length=5, max_length=300)
    description: Optional[str] = None
    options: list[PollOptionCreate] = Field(..., min_length=2, max_length=10)
    allow_multiple: bool = False
    is_anonymous: bool = False
    expires_at: Optional[datetime] = None


class PollUpdate(BaseModel):
    question: Optional[str] = Field(default=None, min_length=5, max_length=300)
    description: Optional[str] = None
    status: Optional[PollStatus] = None
    expires_at: Optional[datetime] = None


class VoteRequest(BaseModel):
    option_ids: list[uuid.UUID] = Field(..., min_length=1)


class PollOptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    text: str
    sort_order: int
    vote_count: int = 0


class PollResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    author_id: uuid.UUID
    question: str
    description: Optional[str] = None
    status: PollStatus
    allow_multiple: bool
    is_anonymous: bool
    expires_at: Optional[datetime] = None
    total_votes: int = 0
    options: list[PollOptionResponse] = []
    created_at: datetime
    updated_at: datetime


class PollBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    author_id: uuid.UUID
    question: str
    status: PollStatus
    total_votes: int = 0
    created_at: datetime


class PaginatedPolls(BaseModel):
    items: list[PollBrief]
    total: int
    page: int
    limit: int
    pages: int


class PollResultsResponse(BaseModel):
    poll_id: uuid.UUID
    question: str
    total_votes: int
    options: list[PollOptionResponse]
    has_voted: bool
    user_votes: list[uuid.UUID] = []


class PollStatsResponse(BaseModel):
    project_id: uuid.UUID
    total_polls: int
    active_polls: int
    closed_polls: int
    total_votes_across_polls: int
