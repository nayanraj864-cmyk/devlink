from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.cache import cache_manager
from app.dependencies import get_current_user, get_database
from app.middleware.idempotency import IdempotentRoute
from app.middleware.rate_limit import limiter
from app.models.project import Project
from app.models.project_poll import PollStatus
from app.models.user import User
from app.schemas.project_poll import (
    PaginatedPolls, PollCreate, PollResponse, PollResultsResponse,
    PollStatsResponse, PollUpdate, VoteRequest,
)
from app.services.project_poll_service import ProjectPollService

router = APIRouter(prefix="/project-polls", tags=["Project Polls"], route_class=IdempotentRoute)


@router.post("/{project_id}", response_model=PollResponse, status_code=status.HTTP_201_CREATED, summary="Create poll")
@limiter.limit("20/minute")
def create_poll(request: Request, project_id: uuid.UUID, body: PollCreate,
                db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    if not db.get(Project, project_id): raise HTTPException(404, "Project not found")
    return ProjectPollService.create(db, project_id, current_user.id, body)


@router.get("/{project_id}", response_model=PaginatedPolls, summary="List polls")
def list_polls(project_id: uuid.UUID, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
               poll_status: PollStatus | None = Query(None, alias="status"), db: Session = Depends(get_database)):
    r = ProjectPollService.list_polls(db, project_id, page=page, limit=limit, status=poll_status)
    return PaginatedPolls(items=r["items"], total=r["total"], page=r["page"], limit=r["limit"], pages=r["pages"])


@router.get("/{project_id}/stats", response_model=PollStatsResponse, summary="Poll stats")
def poll_stats(project_id: uuid.UUID, db: Session = Depends(get_database)):
    return ProjectPollService.get_stats(db, project_id)


@router.get("/poll/{poll_id}", response_model=PollResultsResponse, summary="Get poll with results")
def get_poll(poll_id: uuid.UUID, db: Session = Depends(get_database),
             current_user: User = Depends(get_current_user)):
    result = ProjectPollService.get_with_results(db, poll_id, current_user.id)
    if not result: raise HTTPException(404, "Poll not found")
    return result


@router.patch("/poll/{poll_id}", response_model=PollResponse, summary="Update poll")
def update_poll(poll_id: uuid.UUID, body: PollUpdate, db: Session = Depends(get_database),
                current_user: User = Depends(get_current_user)):
    poll = ProjectPollService.update(db, poll_id, body)
    if not poll: raise HTTPException(404, "Poll not found")
    cache_manager.delete_pattern(f"polls:{poll.project_id}*"); return poll


@router.delete("/poll/{poll_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete poll")
@limiter.limit("20/minute")
def delete_poll(request: Request, poll_id: uuid.UUID, db: Session = Depends(get_database),
                current_user: User = Depends(get_current_user)):
    poll = ProjectPollService.get(db, poll_id)
    if not poll: raise HTTPException(404, "Poll not found")
    if poll.author_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(403, "Only the author or admin can delete")
    ProjectPollService.delete(db, poll_id); cache_manager.delete_pattern(f"polls:{poll.project_id}*")


@router.post("/poll/{poll_id}/vote", response_model=PollResultsResponse, summary="Vote")
@limiter.limit("60/minute")
def vote_poll(request: Request, poll_id: uuid.UUID, body: VoteRequest,
              db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    try:
        return ProjectPollService.vote(db, poll_id, current_user.id, body)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/poll/{poll_id}/vote", status_code=status.HTTP_204_NO_CONTENT, summary="Remove vote")
def remove_vote(poll_id: uuid.UUID, db: Session = Depends(get_database),
                current_user: User = Depends(get_current_user)):
    ProjectPollService.remove_vote(db, poll_id, current_user.id)


@router.patch("/poll/{poll_id}/close", response_model=PollResponse, summary="Close poll")
def close_poll(poll_id: uuid.UUID, db: Session = Depends(get_database),
               current_user: User = Depends(get_current_user)):
    poll = ProjectPollService.update(db, poll_id, PollUpdate(status=PollStatus.CLOSED))
    if not poll: raise HTTPException(404, "Poll not found")
    cache_manager.delete_pattern(f"polls:{poll.project_id}*"); return poll
