from __future__ import annotations

import math
import uuid

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.project_poll import PollOption, PollStatus, PollVote, ProjectPoll
from app.schemas.project_poll import PollCreate, PollUpdate, VoteRequest


class ProjectPollService:

    @staticmethod
    def create(db, project_id, author_id, payload: PollCreate):
        poll = ProjectPoll(project_id=project_id, author_id=author_id,
            question=payload.question, description=payload.description,
            allow_multiple=payload.allow_multiple, is_anonymous=payload.is_anonymous,
            expires_at=payload.expires_at)
        db.add(poll); db.flush()
        for i, opt in enumerate(payload.options):
            db.add(PollOption(poll_id=poll.id, text=opt.text, sort_order=i))
        db.flush(); db.refresh(poll); return poll

    @staticmethod
    def get(db, poll_id): return db.get(ProjectPoll, poll_id)

    @staticmethod
    def update(db, poll_id, payload: PollUpdate):
        poll = db.get(ProjectPoll, poll_id)
        if not poll: return None
        for k, v in payload.model_dump(exclude_unset=True).items(): setattr(poll, k, v)
        db.flush(); db.refresh(poll); return poll

    @staticmethod
    def delete(db, poll_id) -> bool:
        poll = db.get(ProjectPoll, poll_id)
        if not poll: return False
        db.delete(poll); db.flush(); return True

    @staticmethod
    def _opt_votes(db, opt_id):
        return db.scalar(select(func.count()).select_from(PollVote).where(PollVote.option_id == opt_id)) or 0

    @staticmethod
    def _build_result(db, poll, voter_id=None):
        opts = list(db.scalars(select(PollOption).where(PollOption.poll_id == poll.id).order_by(PollOption.sort_order)))
        total = sum(ProjectPollService._opt_votes(db, o.id) for o in opts)
        opt_list = [{"id": o.id, "text": o.text, "sort_order": o.sort_order,
                     "vote_count": ProjectPollService._opt_votes(db, o.id)} for o in opts]
        user_votes, has_voted = [], False
        if voter_id:
            user_votes = list(db.scalars(select(PollVote.option_id).where(and_(
                PollVote.poll_id == poll.id, PollVote.voter_id == voter_id))))
            has_voted = len(user_votes) > 0
        return {"poll": poll, "options": opt_list, "total_votes": total,
                "has_voted": has_voted, "user_votes": [str(v) for v in user_votes]}

    @staticmethod
    def get_with_results(db, poll_id, voter_id=None):
        poll = db.get(ProjectPoll, poll_id)
        return ProjectPollService._build_result(db, poll, voter_id) if poll else None

    @staticmethod
    def list_polls(db, project_id, *, page=1, limit=20, status=None):
        f = [ProjectPoll.project_id == project_id]
        if status: f.append(ProjectPoll.status == status)
        total = db.scalar(select(func.count()).select_from(ProjectPoll).where(and_(*f))) or 0
        stmt = (select(ProjectPoll).where(and_(*f)).order_by(ProjectPoll.created_at.desc())
                .offset((page - 1) * limit).limit(limit))
        briefs = []
        for p in db.scalars(stmt):
            tv = sum(ProjectPollService._opt_votes(db, o.id)
                     for o in db.scalars(select(PollOption).where(PollOption.poll_id == p.id)))
            briefs.append({"id": p.id, "author_id": p.author_id, "question": p.question,
                           "status": p.status, "total_votes": tv, "created_at": p.created_at})
        return {"items": briefs, "total": total, "page": page, "limit": limit,
                "pages": math.ceil(total / limit) if total else 0}

    @staticmethod
    def vote(db, poll_id, voter_id, payload: VoteRequest):
        poll = db.get(ProjectPoll, poll_id)
        if not poll or poll.status != PollStatus.ACTIVE:
            raise ValueError("Poll not found or not active")
        if poll.expires_at:
            from datetime import datetime, timezone
            if datetime.now(timezone.utc) > poll.expires_at:
                raise ValueError("Poll has expired")
        if not poll.allow_multiple and len(payload.option_ids) > 1:
            raise ValueError("Multiple selections not allowed")
        valid = {o.id for o in db.scalars(select(PollOption).where(PollOption.poll_id == poll_id))}
        for oid in payload.option_ids:
            if oid not in valid: raise ValueError(f"Invalid option {oid}")
            if not db.scalar(select(PollVote).where(and_(
                    PollVote.poll_id == poll_id, PollVote.voter_id == voter_id, PollVote.option_id == oid))):
                db.add(PollVote(poll_id=poll_id, option_id=oid, voter_id=voter_id))
        db.flush()
        return ProjectPollService._build_result(db, poll, voter_id)

    @staticmethod
    def remove_vote(db, poll_id, voter_id):
        votes = list(db.scalars(select(PollVote).where(and_(
            PollVote.poll_id == poll_id, PollVote.voter_id == voter_id))))
        for v in votes: db.delete(v)
        db.flush(); return len(votes) > 0

    @staticmethod
    def get_stats(db, project_id):
        f = ProjectPoll.project_id == project_id
        cnt = lambda cond: db.scalar(select(func.count()).select_from(ProjectPoll).where(and_(f, cond))) or 0
        vc = db.scalar(select(func.count()).select_from(PollVote).join(ProjectPoll).where(f)) or 0
        return {"project_id": project_id, "total_polls": cnt(None),
                "active_polls": cnt(ProjectPoll.status == PollStatus.ACTIVE),
                "closed_polls": cnt(ProjectPoll.status == PollStatus.CLOSED),
                "total_votes_across_polls": vc}
