from __future__ import annotations

import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.project_member import InvitationStatus, MemberRole
from app.schemas.activity import ActivityResponse
from app.schemas.milestone import MilestoneResponse
from app.schemas.announcement import AnnouncementResponse


class DashboardMember(BaseModel):
    user_id: uuid.UUID
    username: str
    full_name: str | None
    profile_image: str | None
    role: MemberRole
    is_online: bool
    last_seen: datetime | None


class DashboardInvitation(BaseModel):
    user_id: uuid.UUID
    username: str
    full_name: str | None
    profile_image: str | None
    role: MemberRole
    invited_at: datetime
    expires_at: datetime | None = None
    status: InvitationStatus


class ProjectDashboardResponse(BaseModel):
    project_id: uuid.UUID
    title: str
    stage: str
    recent_activity: list[ActivityResponse]
    milestones: list[MilestoneResponse]
    announcements: list[AnnouncementResponse]
    members: list[DashboardMember]
    pending_invitations: list[DashboardInvitation]

    class Config:
        from_attributes = True
