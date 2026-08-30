from __future__ import annotations

import math
import uuid
from collections import Counter

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.project_meeting_note import ProjectMeetingNote
from app.schemas.project_meeting_note import MeetingNoteCreate, MeetingNoteUpdate


class ProjectMeetingNoteService:

    @staticmethod
    def create(db, project_id, author_id, payload: MeetingNoteCreate):
        data = payload.model_dump()
        data["attendees"] = [str(a) for a in data.get("attendees", [])]
        data["action_items"] = [ai.model_dump() for ai in data.get("action_items", [])]
        note = ProjectMeetingNote(project_id=project_id, author_id=author_id, **data)
        db.add(note); db.flush(); db.refresh(note); return note

    @staticmethod
    def get(db, note_id): return db.get(ProjectMeetingNote, note_id)

    @staticmethod
    def update(db, note_id, payload: MeetingNoteUpdate):
        note = db.get(ProjectMeetingNote, note_id)
        if not note: return None
        for k, v in payload.model_dump(exclude_unset=True).items():
            if k == "attendees" and v is not None:
                v = [str(a) for a in v]
            elif k == "action_items" and v is not None:
                v = [ai.model_dump() if hasattr(ai, "model_dump") else ai for ai in v]
            setattr(note, k, v)
        db.flush(); db.refresh(note); return note

    @staticmethod
    def delete(db, note_id) -> bool:
        note = db.get(ProjectMeetingNote, note_id)
        if not note: return False
        db.delete(note); db.flush(); return True

    @staticmethod
    def list_notes(db, project_id, *, page=1, limit=20, tag=None):
        f = [ProjectMeetingNote.project_id == project_id]
        if tag:
            f.append(ProjectMeetingNote.tags.op("@>")(f'["{tag}"]'))
        total = db.scalar(select(func.count()).select_from(ProjectMeetingNote).where(and_(*f))) or 0
        stmt = (select(ProjectMeetingNote).where(and_(*f))
            .order_by(ProjectMeetingNote.meeting_date.desc().nullslast(), ProjectMeetingNote.created_at.desc())
            .offset((page - 1) * limit).limit(limit))
        return {"items": list(db.scalars(stmt)), "total": total,
                "page": page, "limit": limit, "pages": math.ceil(total / limit) if total else 0}

    @staticmethod
    def search(db, project_id, query):
        p = f"%{query}%"
        f = [ProjectMeetingNote.project_id == project_id,
             or_(ProjectMeetingNote.title.ilike(p), ProjectMeetingNote.summary.ilike(p))]
        stmt = (select(ProjectMeetingNote).where(and_(*f))
            .order_by(ProjectMeetingNote.created_at.desc()).limit(50))
        return {"items": list(db.scalars(stmt)),
                "total": db.scalar(select(func.count()).select_from(ProjectMeetingNote).where(and_(*f))) or 0,
                "query": query}

    @staticmethod
    def complete_action_item(db, note_id, action_index: int):
        note = db.get(ProjectMeetingNote, note_id)
        if not note or not note.action_items: return None
        if action_index < 0 or action_index >= len(note.action_items): return None
        note.action_items[action_index]["is_completed"] = True
        db.flush(); db.refresh(note); return note

    @staticmethod
    def get_stats(db, project_id):
        f = ProjectMeetingNote.project_id == project_id
        notes = list(db.scalars(select(ProjectMeetingNote).where(f)))
        total = len(notes)
        all_actions = [ai for n in notes for ai in (n.action_items or [])]
        completed = sum(1 for ai in all_actions if ai.get("is_completed"))
        durations = [n.duration_minutes for n in notes if n.duration_minutes is not None]
        all_attendees = [a for n in notes for a in (n.attendees or [])]
        return {"project_id": project_id, "total_meetings": total,
                "total_action_items": len(all_actions), "completed_action_items": completed,
                "total_attendees_seen": len(set(all_attendees)),
                "avg_duration_minutes": round(sum(durations) / len(durations), 1) if durations else None}

    @staticmethod
    def get_action_items(db, project_id, *, completed: bool | None = None):
        notes = list(db.scalars(select(ProjectMeetingNote).where(
            ProjectMeetingNote.project_id == project_id)))
        items = []
        for n in notes:
            for i, ai in enumerate(n.action_items or []):
                if completed is not None and ai.get("is_completed") != completed:
                    continue
                items.append({"note_id": n.id, "note_title": n.title,
                              "index": i, "action_item": ai})
        return items
