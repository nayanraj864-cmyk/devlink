from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EmailTemplateType(str, Enum):
    WELCOME = "welcome"
    PASSWORD_RESET = "password_reset"
    EMAIL_VERIFICATION = "email_verification"
    TEAM_INVITATION = "team_invitation"
    PROJECT_ACCEPTED = "project_accepted"
    PROJECT_REJECTED = "project_rejected"
    WEEKLY_DIGEST = "weekly_digest"


class EmailRenderRequest(BaseModel):
    template_type: EmailTemplateType
    context: Dict[str, Any] = Field(default_factory=dict)


class EmailRenderResponse(BaseModel):
    template_type: EmailTemplateType
    subject: str
    html_content: str
    text_content: str


class EmailTemplateInfo(BaseModel):
    template_type: EmailTemplateType
    name: str
    description: str
    sample_context: Dict[str, Any]
