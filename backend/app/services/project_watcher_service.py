from __future__ import annotations

import math
import uuid

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.project_watcher import ProjectWatcher, WatchNotificationLevel
from app.schemas.project_watcher import ProjectWatcherCreate, ProjectWatcherUpdate


class ProjectWatcherService:

    @staticmethod
    def watch(db: Session, user_id: uuid.UUID, project_id: uuid.UUID,
              payload: ProjectWatcherCreate | None = None) -> ProjectWatcher:
        existing = ProjectWatcherService.get_watch(db, user_id, project_id)
        if existing is not None:
            return existing
        w = ProjectWatcher(user_id=user_id, project_id=project_id,
            notification_level=payload.notification_level if payload else WatchNotificationLevel.ALL,
            notes=payload.notes if payload else None)
        db.add(w); db.flush(); db.refresh(w); return w

    @staticmethod
    def unwatch(db: Session, user_id: uuid.UUID, project_id: uuid.UUID) -> bool:
        w = ProjectWatcherService.get_watch(db, user_id, project_id)
        if not w: return False
        db.delete(w); db.flush(); return True

    @staticmethod
    def toggle_watch(db: Session, user_id: uuid.UUID, project_id: uuid.UUID,
                     payload: ProjectWatcherCreate | None = None):
        existing = ProjectWatcherService.get_watch(db, user_id, project_id)
        if existing:
            db.delete(existing); db.flush(); return True, None
        return False, ProjectWatcherService.watch(db, user_id, project_id, payload)

    @staticmethod
    def get_watch(db: Session, user_id: uuid.UUID, project_id: uuid.UUID) -> ProjectWatcher | None:
        return db.scalar(select(ProjectWatcher).where(and_(
            ProjectWatcher.user_id == user_id, ProjectWatcher.project_id == project_id)))

    @staticmethod
    def update_watch(db: Session, user_id: uuid.UUID, project_id: uuid.UUID,
                     payload: ProjectWatcherUpdate) -> ProjectWatcher | None:
        w = ProjectWatcherService.get_watch(db, user_id, project_id)
        if not w: return None
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(w, k, v)
        db.flush(); db.refresh(w); return w

    @staticmethod
    def is_watching(db: Session, user_id: uuid.UUID, project_id: uuid.UUID) -> bool:
        return (db.scalar(select(func.count()).select_from(ProjectWatcher).where(and_(
            ProjectWatcher.user_id == user_id, ProjectWatcher.project_id == project_id))) or 0) > 0

    @staticmethod
    def list_project_watchers(db, project_id, *, page=1, limit=20, level=None):
        f = [ProjectWatcher.project_id == project_id]
        if level: f.append(ProjectWatcher.notification_level == level)
        total = db.scalar(select(func.count()).select_from(ProjectWatcher).where(and_(*f))) or 0
        stmt = (select(ProjectWatcher).where(and_(*f))
            .order_by(ProjectWatcher.is_pinned.desc(), ProjectWatcher.created_at.desc())
            .offset((page - 1) * limit).limit(limit))
        return {"items": list(db.scalars(stmt)), "total": total,
                "page": page, "limit": limit, "pages": math.ceil(total / limit) if total else 0}

    @staticmethod
    def list_user_watched(db, user_id, *, page=1, limit=20):
        f = [ProjectWatcher.user_id == user_id]
        total = db.scalar(select(func.count()).select_from(ProjectWatcher).where(and_(*f))) or 0
        stmt = (select(ProjectWatcher).where(and_(*f))
            .order_by(ProjectWatcher.is_pinned.desc(), ProjectWatcher.created_at.desc())
            .offset((page - 1) * limit).limit(limit))
        return {"items": list(db.scalars(stmt)), "total": total,
                "page": page, "limit": limit, "pages": math.ceil(total / limit) if total else 0}

    @staticmethod
    def get_project_stats(db, project_id):
        f = ProjectWatcher.project_id == project_id
        total = db.scalar(select(func.count()).select_from(ProjectWatcher).where(f)) or 0
        levels = {}
        for lv in WatchNotificationLevel:
            levels[lv.value] = db.scalar(select(func.count()).select_from(ProjectWatcher).where(
                and_(f, ProjectWatcher.notification_level == lv))) or 0
        pinned = db.scalar(select(func.count()).select_from(ProjectWatcher).where(
            and_(f, ProjectWatcher.is_pinned.is_(True)))) or 0
        return {"project_id": project_id, "total_watchers": total,
                "all_level_count": levels.get("all", 0), "major_level_count": levels.get("major", 0),
                "minimal_level_count": levels.get("minimal", 0), "pinned_count": pinned}

    @staticmethod
    def get_user_stats(db, user_id):
        f = ProjectWatcher.user_id == user_id
        total = db.scalar(select(func.count()).select_from(ProjectWatcher).where(f)) or 0
        pinned = db.scalar(select(func.count()).select_from(ProjectWatcher).where(
            and_(f, ProjectWatcher.is_pinned.is_(True)))) or 0
        return {"user_id": user_id, "total_watched": total, "pinned_count": pinned}

    @staticmethod
    def bulk_toggle(db, user_id, project_ids, watch, level=WatchNotificationLevel.ALL):
        watched, unwatched = [], []
        for pid in project_ids:
            if watch:
                ProjectWatcherService.watch(db, user_id, pid, ProjectWatcherCreate(notification_level=level))
                watched.append(pid)
            elif ProjectWatcherService.unwatch(db, user_id, pid):
                unwatched.append(pid)
        return {"watched": watched, "unwatched": unwatched}
