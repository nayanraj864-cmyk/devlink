from __future__ import annotations

import uuid
from datetime import datetime

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict

# pyrefly: ignore [missing-import]

# ==========================================================
# Follower Response
# ==========================================================


from typing import Optional
from app.schemas.user import UserResponse


class FollowerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    follower_id: uuid.UUID
    following_id: uuid.UUID
    created_at: datetime
    follower: Optional[UserResponse] = None
    following: Optional[UserResponse] = None


# ==========================================================
# Follow Status
# ==========================================================


class FollowStatusResponse(BaseModel):
    is_following: bool
    follower_count: int
    following_count: int


# ==========================================================
# Follow Action Response
# ==========================================================


class FollowActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    follower_id: uuid.UUID
    following_id: uuid.UUID
    created_at: datetime
    follower_count: int
    following_count: int


# ==========================================================
# Paginated Follower & Following Responses
# ==========================================================


class PaginatedFollowersResponse(BaseModel):
    items: list[FollowerResponse]
    total: int
    page: int
    limit: int
    pages: int
    has_next: bool
    has_prev: bool


class PaginatedFollowingResponse(BaseModel):
    items: list[FollowerResponse]
    total: int
    page: int
    limit: int
    pages: int
    has_next: bool
    has_prev: bool


# ==========================================================
# Unfollow Response
# ==========================================================


class UnfollowResponse(BaseModel):
    message: str
    follower_count: int
    following_count: int

