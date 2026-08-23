from __future__ import annotations

from typing import Annotated, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.email_template import (
    EmailTemplateInfo,
    EmailRenderRequest,
    EmailRenderResponse,
)
from app.services.email_template_service import EmailTemplateService

router = APIRouter(prefix="/email-templates", tags=["Email Notification Templates"])


@router.get(
    "",
    response_model=List[EmailTemplateInfo],
    status_code=status.HTTP_200_OK,
    summary="List Email Notification Templates",
    description="Returns metadata and sample context variables for all 7 transactional email templates.",
)
@router.get(
    "/",
    response_model=List[EmailTemplateInfo],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def list_email_templates(
    current_user: Annotated[User, Depends(get_current_user)],
) -> List[EmailTemplateInfo]:
    return EmailTemplateService.list_templates()


@router.post(
    "/render",
    response_model=EmailRenderResponse,
    status_code=status.HTTP_200_OK,
    summary="Render Email Template",
    description="Renders responsive HTML and plain-text fallback for a specified email template with custom context.",
)
def render_email_template(
    payload: EmailRenderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> EmailRenderResponse:
    return EmailTemplateService.render_template(
        template_type=payload.template_type, context=payload.context
    )
