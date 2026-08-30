from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.cache import cache_manager
from app.dependencies import get_current_user, get_database
from app.middleware.idempotency import IdempotentRoute
from app.middleware.rate_limit import limiter
from app.models.project import Project
from app.models.project_faq import FaqCategory
from app.models.user import User
from app.schemas.project_faq import (
    FaqBulkCreateRequest,
    FaqBulkCreateResponse,
    FaqEntryCreate,
    FaqEntryResponse,
    FaqEntryUpdate,
    FaqSearchResult,
    FaqStatsResponse,
    PaginatedFaq,
)
from app.services.project_faq_service import ProjectFaqService

router = APIRouter(prefix="/project-faq", tags=["Project FAQ"], route_class=IdempotentRoute)


@router.post("/{project_id}", response_model=FaqEntryResponse, status_code=status.HTTP_201_CREATED,
             summary="Create FAQ entry")
@limiter.limit("30/minute")
def create_entry(request: Request, project_id: uuid.UUID, body: FaqEntryCreate,
                 db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    return ProjectFaqService.create(db, project_id, current_user.id, body)


@router.get("/{project_id}", response_model=PaginatedFaq, summary="List FAQ entries")
def list_entries(project_id: uuid.UUID, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                 category: FaqCategory | None = Query(None), db: Session = Depends(get_database)):
    r = ProjectFaqService.list_entries(db, project_id, page=page, limit=limit, category=category)
    return PaginatedFaq(items=r["items"], total=r["total"], page=r["page"],
                        limit=r["limit"], pages=r["pages"])


@router.get("/{project_id}/search", response_model=FaqSearchResult, summary="Search FAQ")
def search_faq(project_id: uuid.UUID, q: str = Query(..., min_length=2),
               db: Session = Depends(get_database)):
    return ProjectFaqService.search(db, project_id, q)


@router.get("/{project_id}/stats", response_model=FaqStatsResponse, summary="FAQ stats")
def faq_stats(project_id: uuid.UUID, db: Session = Depends(get_database)):
    return ProjectFaqService.get_stats(db, project_id)


@router.get("/{project_id}/top", response_model=list[FaqEntryResponse], summary="Top FAQ entries")
def top_entries(project_id: uuid.UUID, limit: int = Query(5, ge=1, le=20),
                db: Session = Depends(get_database)):
    return ProjectFaqService.top_entries(db, project_id, limit=limit)


@router.get("/entry/{entry_id}", response_model=FaqEntryResponse, summary="Get FAQ entry")
def get_entry(entry_id: uuid.UUID, db: Session = Depends(get_database)):
    entry = ProjectFaqService.get(db, entry_id)
    if not entry:
        raise HTTPException(404, "Entry not found")
    ProjectFaqService.record_view(db, entry_id)
    return entry


@router.patch("/entry/{entry_id}", response_model=FaqEntryResponse, summary="Update FAQ entry")
def update_entry(entry_id: uuid.UUID, body: FaqEntryUpdate, db: Session = Depends(get_database),
                 current_user: User = Depends(get_current_user)):
    entry = ProjectFaqService.update(db, entry_id, body)
    if not entry:
        raise HTTPException(404, "Entry not found")
    cache_manager.delete_pattern(f"faq:{entry.project_id}*")
    return entry


@router.delete("/entry/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete FAQ entry")
@limiter.limit("20/minute")
def delete_entry(request: Request, entry_id: uuid.UUID, db: Session = Depends(get_database),
                 current_user: User = Depends(get_current_user)):
    entry = ProjectFaqService.get(db, entry_id)
    if not entry:
        raise HTTPException(404, "Entry not found")
    if entry.author_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(403, "Only the author or an admin can delete")
    ProjectFaqService.delete(db, entry_id)
    cache_manager.delete_pattern(f"faq:{entry.project_id}*")


@router.post("/entry/{entry_id}/upvote", response_model=FaqEntryResponse, summary="Upvote entry")
@limiter.limit("30/minute")
def upvote_entry(request: Request, entry_id: uuid.UUID, db: Session = Depends(get_database),
                 current_user: User = Depends(get_current_user)):
    entry = ProjectFaqService.upvote(db, entry_id)
    if not entry:
        raise HTTPException(404, "Entry not found")
    return entry


@router.post("/{project_id}/bulk", response_model=FaqBulkCreateResponse, summary="Bulk create FAQ entries")
@limiter.limit("10/minute")
def bulk_create(request: Request, project_id: uuid.UUID, body: FaqBulkCreateRequest,
                db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    return ProjectFaqService.bulk_create(db, project_id, current_user.id, body.entries)
