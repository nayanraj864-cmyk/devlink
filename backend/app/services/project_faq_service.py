from __future__ import annotations

import math
import uuid

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.project_faq import FaqCategory, ProjectFaqEntry
from app.schemas.project_faq import FaqEntryCreate, FaqEntryUpdate


class ProjectFaqService:

    @staticmethod
    def create(db, project_id, author_id, payload: FaqEntryCreate):
        e = ProjectFaqEntry(project_id=project_id, author_id=author_id, **payload.model_dump())
        db.add(e); db.flush(); db.refresh(e); return e

    @staticmethod
    def get(db, entry_id): return db.get(ProjectFaqEntry, entry_id)

    @staticmethod
    def update(db, entry_id, payload: FaqEntryUpdate):
        e = db.get(ProjectFaqEntry, entry_id)
        if not e: return None
        for k, v in payload.model_dump(exclude_unset=True).items(): setattr(e, k, v)
        db.flush(); db.refresh(e); return e

    @staticmethod
    def delete(db, entry_id) -> bool:
        e = db.get(ProjectFaqEntry, entry_id)
        if not e: return False
        db.delete(e); db.flush(); return True

    @staticmethod
    def list_entries(db, project_id, *, page=1, limit=20, category=None):
        f = [ProjectFaqEntry.project_id == project_id]
        if category: f.append(ProjectFaqEntry.category == category)
        total = db.scalar(select(func.count()).select_from(ProjectFaqEntry).where(and_(*f))) or 0
        stmt = (select(ProjectFaqEntry).where(and_(*f))
            .order_by(ProjectFaqEntry.is_pinned.desc(), ProjectFaqEntry.sort_order.asc(),
                      ProjectFaqEntry.created_at.desc()).offset((page - 1) * limit).limit(limit))
        return {"items": list(db.scalars(stmt)), "total": total,
                "page": page, "limit": limit, "pages": math.ceil(total / limit) if total else 0}

    @staticmethod
    def search(db, project_id, query):
        p = f"%{query}%"
        f = [ProjectFaqEntry.project_id == project_id,
             or_(ProjectFaqEntry.question.ilike(p), ProjectFaqEntry.answer.ilike(p))]
        return {"items": list(db.scalars(select(ProjectFaqEntry).where(and_(*f))
            .order_by(ProjectFaqEntry.upvotes.desc()).limit(50))),
            "total": db.scalar(select(func.count()).select_from(ProjectFaqEntry).where(and_(*f))) or 0,
            "query": query}

    @staticmethod
    def upvote(db, entry_id):
        e = db.get(ProjectFaqEntry, entry_id)
        if not e: return None
        e.upvotes += 1; db.flush(); db.refresh(e); return e

    @staticmethod
    def record_view(db, entry_id):
        e = db.get(ProjectFaqEntry, entry_id)
        if not e: return None
        e.views += 1; db.flush(); return e

    @staticmethod
    def get_stats(db, project_id):
        f = ProjectFaqEntry.project_id == project_id
        cnt = lambda cond: db.scalar(select(func.count()).select_from(ProjectFaqEntry).where(
            and_(f, cond) if cond else f)) or 0
        up = db.scalar(select(func.coalesce(func.sum(ProjectFaqEntry.upvotes), 0)).where(f)) or 0
        by_cat = {c.value: cnt(ProjectFaqEntry.category == c) for c in FaqCategory}
        return {"project_id": project_id, "total_entries": cnt(None),
                "accepted_count": cnt(ProjectFaqEntry.is_accepted.is_(True)),
                "pinned_count": cnt(ProjectFaqEntry.is_pinned.is_(True)),
                "total_upvotes": up, "by_category": by_cat}

    @staticmethod
    def bulk_create(db, project_id, author_id, entries):
        ids = []
        for e in entries:
            entry = ProjectFaqEntry(project_id=project_id, author_id=author_id, **e.model_dump())
            db.add(entry); db.flush(); db.refresh(entry); ids.append(entry.id)
        return {"created": len(ids), "entry_ids": ids}

    @staticmethod
    def top_entries(db, project_id, *, limit=5):
        return list(db.scalars(select(ProjectFaqEntry).where(ProjectFaqEntry.project_id == project_id)
            .order_by(ProjectFaqEntry.upvotes.desc(), ProjectFaqEntry.views.desc()).limit(limit)))
