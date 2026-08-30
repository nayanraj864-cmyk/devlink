from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.cache import cache_manager
from app.dependencies import get_current_user, get_database
from app.middleware.idempotency import IdempotentRoute
from app.middleware.rate_limit import limiter
from app.models.project_watcher import WatchNotificationLevel
from app.models.user import User
from app.schemas.project_watcher import (
    PaginatedWatchers,
    ProjectWatcherBulkRequest,
    ProjectWatcherBulkResponse,
    ProjectWatcherCreate,
    ProjectWatcherResponse,
    ProjectWatcherStatsResponse,
    ProjectWatcherUpdate,
)
from app.services.project_watcher_service import ProjectWatcherService

router = APIRouter(prefix="/project-watchers", tags=["Project Watchers"], route_class=IdempotentRoute)


@router.post("/{project_id}/watch", response_model=ProjectWatcherResponse, status_code=status.HTTP_201_CREATED,
             summary="Watch a project")
@limiter.limit("60/minute")
def watch_project(request: Request, project_id: uuid.UUID, body: ProjectWatcherCreate | None = None,
                  db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    from app.models.project import Project
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    watcher = ProjectWatcherService.watch(db, current_user.id, project_id, body)
    cache_manager.delete_pattern(f"watchers:*{project_id}*")
    return watcher


@router.delete("/{project_id}/watch", status_code=status.HTTP_204_NO_CONTENT, summary="Unwatch a project")
@limiter.limit("60/minute")
def unwatch_project(request: Request, project_id: uuid.UUID,
                    db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    ProjectWatcherService.unwatch(db, current_user.id, project_id)
    cache_manager.delete_pattern(f"watchers:*{project_id}*")
    return None


@router.post("/{project_id}/toggle", response_model=ProjectWatcherResponse | None, summary="Toggle watch")
@limiter.limit("60/minute")
def toggle_watch(request: Request, project_id: uuid.UUID, body: ProjectWatcherCreate | None = None,
                 db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    _, watcher = ProjectWatcherService.toggle_watch(db, current_user.id, project_id, body)
    cache_manager.delete_pattern(f"watchers:*{project_id}*")
    return watcher


@router.patch("/{project_id}/watch", response_model=ProjectWatcherResponse, summary="Update watch preferences")
def update_watch(project_id: uuid.UUID, body: ProjectWatcherUpdate,
                 db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    watcher = ProjectWatcherService.update_watch(db, current_user.id, project_id, body)
    if not watcher:
        raise HTTPException(404, "Not watching this project")
    return watcher


@router.get("/{project_id}/status", summary="Check watch status")
def check_status(project_id: uuid.UUID, db: Session = Depends(get_database),
                 current_user: User = Depends(get_current_user)):
    return {"watching": ProjectWatcherService.is_watching(db, current_user.id, project_id),
            "project_id": str(project_id)}


@router.get("/project/{project_id}", response_model=PaginatedWatchers, summary="List project watchers")
def list_project_watchers(project_id: uuid.UUID, page: int = Query(1, ge=1),
                          limit: int = Query(20, ge=1, le=100),
                          level: WatchNotificationLevel | None = Query(None),
                          db: Session = Depends(get_database)):
    r = ProjectWatcherService.list_project_watchers(db, project_id, page=page, limit=limit, level=level)
    return PaginatedWatchers(items=r["items"], total=r["total"], page=r["page"],
                             limit=r["limit"], pages=r["pages"])


@router.get("/me/watched", response_model=PaginatedWatchers, summary="List my watched projects")
def list_my_watched(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                    db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    r = ProjectWatcherService.list_user_watched(db, current_user.id, page=page, limit=limit)
    return PaginatedWatchers(items=r["items"], total=r["total"], page=r["page"],
                             limit=r["limit"], pages=r["pages"])


@router.post("/bulk", response_model=ProjectWatcherBulkResponse, summary="Bulk watch/unwatch")
@limiter.limit("10/minute")
def bulk_toggle(request: Request, body: ProjectWatcherBulkRequest,
                db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    return ProjectWatcherService.bulk_toggle(db, current_user.id, body.project_ids,
                                             body.watch, body.notification_level)


@router.get("/project/{project_id}/stats", response_model=ProjectWatcherStatsResponse,
            summary="Project watcher stats")
def project_stats(project_id: uuid.UUID, db: Session = Depends(get_database)):
    return ProjectWatcherService.get_project_stats(db, project_id)


@router.get("/me/stats", summary="My watcher stats")
def my_stats(db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    return ProjectWatcherService.get_user_stats(db, current_user.id)
