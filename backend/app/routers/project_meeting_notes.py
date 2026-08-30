from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.cache import cache_manager
from app.dependencies import get_current_user, get_database
from app.middleware.idempotency import IdempotentRoute
from app.middleware.rate_limit import limiter
from app.models.project import Project
from app.models.user import User
from app.schemas.project_meeting_note import (
    MeetingNoteCreate,
    MeetingNoteResponse,
    MeetingNoteSearchResult,
    MeetingNoteStatsResponse,
    MeetingNoteUpdate,
    PaginatedMeetingNotes,
)
from app.services.project_meeting_note_service import ProjectMeetingNoteService

router = APIRouter(prefix="/project-meetings", tags=["Project Meeting Notes"], route_class=IdempotentRoute)


@router.post("/{project_id}", response_model=MeetingNoteResponse, status_code=status.HTTP_201_CREATED,
             summary="Create meeting note")
@limiter.limit("30/minute")
def create_note(request: Request, project_id: uuid.UUID, body: MeetingNoteCreate,
                db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    return ProjectMeetingNoteService.create(db, project_id, current_user.id, body)


@router.get("/{project_id}", response_model=PaginatedMeetingNotes, summary="List meeting notes")
def list_notes(project_id: uuid.UUID, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
               tag: str | None = Query(None), db: Session = Depends(get_database)):
    r = ProjectMeetingNoteService.list_notes(db, project_id, page=page, limit=limit, tag=tag)
    return PaginatedMeetingNotes(items=r["items"], total=r["total"], page=r["page"],
                                 limit=r["limit"], pages=r["pages"])


@router.get("/{project_id}/search", response_model=MeetingNoteSearchResult, summary="Search meeting notes")
def search_notes(project_id: uuid.UUID, q: str = Query(..., min_length=2),
                 db: Session = Depends(get_database)):
    return ProjectMeetingNoteService.search(db, project_id, q)


@router.get("/{project_id}/stats", response_model=MeetingNoteStatsResponse, summary="Meeting stats")
def meeting_stats(project_id: uuid.UUID, db: Session = Depends(get_database)):
    return ProjectMeetingNoteService.get_stats(db, project_id)


@router.get("/{project_id}/action-items", summary="List all action items")
def list_action_items(project_id: uuid.UUID, completed: bool | None = Query(None),
                      db: Session = Depends(get_database)):
    return ProjectMeetingNoteService.get_action_items(db, project_id, completed=completed)


@router.get("/note/{note_id}", response_model=MeetingNoteResponse, summary="Get meeting note")
def get_note(note_id: uuid.UUID, db: Session = Depends(get_database)):
    note = ProjectMeetingNoteService.get(db, note_id)
    if not note: raise HTTPException(404, "Note not found")
    return note


@router.patch("/note/{note_id}", response_model=MeetingNoteResponse, summary="Update meeting note")
def update_note(note_id: uuid.UUID, body: MeetingNoteUpdate, db: Session = Depends(get_database),
                current_user: User = Depends(get_current_user)):
    note = ProjectMeetingNoteService.update(db, note_id, body)
    if not note: raise HTTPException(404, "Note not found")
    cache_manager.delete_pattern(f"meetings:{note.project_id}*")
    return note


@router.delete("/note/{note_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete meeting note")
@limiter.limit("20/minute")
def delete_note(request: Request, note_id: uuid.UUID, db: Session = Depends(get_database),
                current_user: User = Depends(get_current_user)):
    note = ProjectMeetingNoteService.get(db, note_id)
    if not note: raise HTTPException(404, "Note not found")
    if note.author_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(403, "Only the author or admin can delete")
    ProjectMeetingNoteService.delete(db, note_id)
    cache_manager.delete_pattern(f"meetings:{note.project_id}*")


@router.patch("/note/{note_id}/action-items/{action_index}/complete",
              response_model=MeetingNoteResponse, summary="Mark action item complete")
def complete_action(note_id: uuid.UUID, action_index: int, db: Session = Depends(get_database),
                    current_user: User = Depends(get_current_user)):
    note = ProjectMeetingNoteService.complete_action_item(db, note_id, action_index)
    if not note: raise HTTPException(404, "Note or action item not found")
    cache_manager.delete_pattern(f"meetings:{note.project_id}*")
    return note
