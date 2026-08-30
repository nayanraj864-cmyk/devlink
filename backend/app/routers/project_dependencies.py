from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.cache import cache_manager
from app.dependencies import get_current_user, get_database
from app.middleware.idempotency import IdempotentRoute
from app.middleware.rate_limit import limiter
from app.models.project import Project
from app.models.project_dependency import DependencyScope, DependencyType
from app.models.user import User
from app.schemas.project_dependency import (
    BulkDependencyRequest,
    CyclicDependencyCheckResponse,
    DependencyCreate,
    DependencyGraphResponse,
    DependencyResponse,
    DependencyStatsResponse,
    DependencyUpdate,
    PaginatedDependencies,
)
from app.services.project_dependency_service import ProjectDependencyService

router = APIRouter(prefix="/project-dependencies", tags=["Project Dependencies"], route_class=IdempotentRoute)


@router.post("/{project_id}", response_model=DependencyResponse, status_code=status.HTTP_201_CREATED,
             summary="Add a dependency")
@limiter.limit("30/minute")
def add_dependency(request: Request, project_id: uuid.UUID, body: DependencyCreate,
                   db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Source project not found")
    if not db.get(Project, body.target_project_id):
        raise HTTPException(404, "Target project not found")
    try:
        dep = ProjectDependencyService.add(db, project_id, body)
    except ValueError as e:
        raise HTTPException(400, str(e))
    cache_manager.delete_pattern(f"deps:{project_id}*")
    return dep


@router.delete("/{project_id}/{target_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a dependency")
@limiter.limit("30/minute")
def remove_dependency(request: Request, project_id: uuid.UUID, target_id: uuid.UUID,
                      db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ProjectDependencyService.remove(db, project_id, target_id):
        raise HTTPException(404, "Dependency not found")
    cache_manager.delete_pattern(f"deps:{project_id}*")


@router.patch("/{dep_id}", response_model=DependencyResponse, summary="Update dependency")
def update_dependency(dep_id: uuid.UUID, body: DependencyUpdate,
                      db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    dep = ProjectDependencyService.update(db, dep_id, body)
    if not dep:
        raise HTTPException(404, "Dependency not found")
    return dep


@router.get("/{project_id}", response_model=PaginatedDependencies, summary="List dependencies of a project")
def list_depends_on(project_id: uuid.UUID, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                    dep_type: DependencyType | None = Query(None), scope: DependencyScope | None = Query(None),
                    db: Session = Depends(get_database)):
    r = ProjectDependencyService.get_depends_on(db, project_id, page=page, limit=limit, dep_type=dep_type, scope=scope)
    return PaginatedDependencies(items=r["items"], total=r["total"], page=r["page"],
                                 limit=r["limit"], pages=r["pages"])


@router.get("/{project_id}/reverse", response_model=PaginatedDependencies, summary="Projects that depend on this")
def list_depended_by(project_id: uuid.UUID, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                     db: Session = Depends(get_database)):
    r = ProjectDependencyService.get_depended_by(db, project_id, page=page, limit=limit)
    return PaginatedDependencies(items=r["items"], total=r["total"], page=r["page"],
                                 limit=r["limit"], pages=r["pages"])


@router.get("/{project_id}/graph", response_model=DependencyGraphResponse, summary="Dependency graph")
def dependency_graph(project_id: uuid.UUID, db: Session = Depends(get_database)):
    return ProjectDependencyService.get_graph(db, project_id)


@router.get("/{project_id}/stats", response_model=DependencyStatsResponse, summary="Dependency stats")
def dependency_stats(project_id: uuid.UUID, db: Session = Depends(get_database)):
    return ProjectDependencyService.get_stats(db, project_id)


@router.post("/check-cycle", response_model=CyclicDependencyCheckResponse, summary="Check for cycles")
def check_cycle(source_id: uuid.UUID = Query(...), target_id: uuid.UUID = Query(...),
                db: Session = Depends(get_database)):
    return ProjectDependencyService.detect_cycle(db, source_id, target_id)


@router.post("/{project_id}/bulk", summary="Bulk add dependencies")
@limiter.limit("10/minute")
def bulk_add(request: Request, project_id: uuid.UUID, body: BulkDependencyRequest,
             db: Session = Depends(get_database), current_user: User = Depends(get_current_user)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Source project not found")
    return ProjectDependencyService.bulk_add(db, project_id, body)
