from __future__ import annotations

import math
import uuid

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.project_dependency import DependencyScope, DependencyType, ProjectDependency
from app.schemas.project_dependency import BulkDependencyRequest, DependencyCreate, DependencyUpdate


class ProjectDependencyService:

    @staticmethod
    def add(db, source_id, payload: DependencyCreate) -> ProjectDependency:
        if source_id == payload.target_project_id:
            raise ValueError("Cannot depend on self")
        if ProjectDependencyService.get_between(db, source_id, payload.target_project_id):
            raise ValueError("Dependency already exists")
        dep = ProjectDependency(source_project_id=source_id, **payload.model_dump())
        db.add(dep); db.flush(); db.refresh(dep); return dep

    @staticmethod
    def remove(db, source_id, target_id) -> bool:
        dep = ProjectDependencyService.get_between(db, source_id, target_id)
        if not dep: return False
        db.delete(dep); db.flush(); return True

    @staticmethod
    def update(db, dep_id, payload: DependencyUpdate):
        dep = db.get(ProjectDependency, dep_id)
        if not dep: return None
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(dep, k, v)
        db.flush(); db.refresh(dep); return dep

    @staticmethod
    def get_between(db, source_id, target_id):
        return db.scalar(select(ProjectDependency).where(and_(
            ProjectDependency.source_project_id == source_id, ProjectDependency.target_project_id == target_id)))

    @staticmethod
    def _list(db, filters, *, page=1, limit=20):
        total = db.scalar(select(func.count()).select_from(ProjectDependency).where(and_(*filters))) or 0
        stmt = (select(ProjectDependency).where(and_(*filters))
            .order_by(ProjectDependency.created_at.desc()).offset((page - 1) * limit).limit(limit))
        return {"items": list(db.scalars(stmt)), "total": total,
                "page": page, "limit": limit, "pages": math.ceil(total / limit) if total else 0}

    @staticmethod
    def get_depends_on(db, project_id, *, page=1, limit=20, dep_type=None, scope=None):
        f = [ProjectDependency.source_project_id == project_id]
        if dep_type: f.append(ProjectDependency.dependency_type == dep_type)
        if scope: f.append(ProjectDependency.scope == scope)
        return ProjectDependencyService._list(db, f, page=page, limit=limit)

    @staticmethod
    def get_depended_by(db, project_id, *, page=1, limit=20):
        return ProjectDependencyService._list(db, [ProjectDependency.target_project_id == project_id], page=page, limit=limit)

    @staticmethod
    def get_graph(db, project_id):
        return {"project_id": project_id,
                "depends_on": ProjectDependencyService.get_depends_on(db, project_id, limit=100)["items"],
                "depended_by": ProjectDependencyService.get_depended_by(db, project_id, limit=100)["items"]}

    @staticmethod
    def get_stats(db, project_id):
        f_src = ProjectDependency.source_project_id == project_id
        f_tgt = ProjectDependency.target_project_id == project_id
        cnt = lambda f: db.scalar(select(func.count()).select_from(ProjectDependency).where(f)) or 0
        return {"project_id": project_id, "total_depends_on": cnt(f_src), "total_depended_by": cnt(f_tgt),
                "hard_count": cnt(and_(f_src, ProjectDependency.dependency_type == DependencyType.HARD)),
                "soft_count": cnt(and_(f_src, ProjectDependency.dependency_type == DependencyType.SOFT)),
                "optional_count": cnt(and_(f_src, ProjectDependency.dependency_type == DependencyType.OPTIONAL))}

    @staticmethod
    def detect_cycle(db, source_id, target_id, max_depth=10):
        from app.schemas.project_dependency import CyclicDependencyCheckResponse
        visited, path = set(), [source_id]
        stack = [source_id]
        while stack and len(visited) < max_depth:
            cur = stack.pop()
            if cur in visited: continue
            visited.add(cur)
            if cur == target_id and len(visited) > 1:
                return CyclicDependencyCheckResponse(has_cycle=True, cycle_path=path + [target_id])
            for n in db.scalars(select(ProjectDependency.target_project_id).where(
                    ProjectDependency.source_project_id == cur)):
                if n not in visited: stack.append(n); path.append(n)
        return CyclicDependencyCheckResponse(has_cycle=False)

    @staticmethod
    def bulk_add(db, source_id, payload: BulkDependencyRequest):
        added, skipped = [], []
        for tid in payload.target_project_ids:
            try:
                ProjectDependencyService.add(db, source_id, DependencyCreate(
                    target_project_id=tid, dependency_type=payload.dependency_type, scope=payload.scope))
                added.append(str(tid))
            except ValueError:
                skipped.append(str(tid))
        return {"added": added, "skipped": skipped}
