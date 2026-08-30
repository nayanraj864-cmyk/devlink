from __future__ import annotations

import uuid

# pyrefly: ignore [missing-import]
from sqlalchemy import and_, select, func

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.models.activity import ActivityType
from app.models.follower import Follower
from app.models.user import User
from app.services.activity_service import ActivityService
from app.services.notification_service import NotificationService


from app.services.block_service import BlockService
from fastapi import HTTPException, status


class FollowerService:
    """
    Business logic for user follow relationships.
    """

    @staticmethod
    def follow_user(
        db: Session,
        follower_id: uuid.UUID,
        following_id: uuid.UUID,
    ) -> Follower:

        if BlockService.is_blocked(db, follower_id, following_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot follow a user who has blocked you or whom you have blocked.",
            )

        existing = FollowerService.get_relationship(db, follower_id, following_id)
        if existing:
            return existing

        relationship = Follower(
            follower_id=follower_id,
            following_id=following_id,
        )

        db.add(relationship)
        db.flush()
        db.refresh(relationship)

        following_user = db.get(User, following_id)
        following_username = (
            following_user.username if following_user else str(following_id)
        )

        ActivityService.record_activity(
            db=db,
            actor_id=follower_id,
            activity_type=ActivityType.FOLLOWED_USER,
            title="Followed a builder",
            description=f"Started following @{following_username}",
            target_id=following_id,
            target_type="user",
            icon="user-plus",
            color="success",
        )

        # Trigger notification
        follower = db.get(User, follower_id)
        follower_name = (
            f"{follower.first_name} {follower.last_name}" if follower else "Someone"
        )
        follower_username = follower.username if follower else ""

        NotificationService.create_follow_notification(
            db=db,
            recipient_id=following_id,
            actor_id=follower_id,
            title="New Follower",
            message=f"{follower_name} started following you.",
            action_url=f"/profile/{follower_username}" if follower_username else None,
        )

        return relationship

    @staticmethod
    def get_relationship(
        db: Session,
        follower_id: uuid.UUID,
        following_id: uuid.UUID,
    ) -> Follower | None:

        stmt = select(Follower).where(
            and_(
                Follower.follower_id == follower_id,
                Follower.following_id == following_id,
            )
        )

        return db.scalar(stmt)

    @staticmethod
    def is_following(
        db: Session,
        follower_id: uuid.UUID,
        following_id: uuid.UUID,
    ) -> bool:

        stmt = select(Follower).where(
            and_(
                Follower.follower_id == follower_id,
                Follower.following_id == following_id,
            )
        )

        return db.scalar(stmt) is not None

    @staticmethod
    def list_followers(
        db: Session,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int | None = None,
    ) -> list[Follower]:
        stmt = (
            select(Follower)
            .where(Follower.following_id == user_id)
            .order_by(Follower.created_at.desc())
        )
        if skip:
            stmt = stmt.offset(skip)
        if limit is not None:
            stmt = stmt.limit(limit)

        return list(db.scalars(stmt))

    @staticmethod
    def list_followers_paginated(
        db: Session,
        user_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Follower], int, int, bool, bool]:
        page = max(1, int(page or 1))
        limit = max(1, min(int(limit or 20), 100))
        offset = (page - 1) * limit

        total = FollowerService.follower_count(db, user_id)
        pages = max(1, (total + limit - 1) // limit) if total > 0 else 1

        items = FollowerService.list_followers(
            db=db,
            user_id=user_id,
            skip=offset,
            limit=limit,
        )

        has_next = page < pages
        has_prev = page > 1

        return items, total, pages, has_next, has_prev

    @staticmethod
    def list_following(
        db: Session,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int | None = None,
    ) -> list[Follower]:
        stmt = (
            select(Follower)
            .where(Follower.follower_id == user_id)
            .order_by(Follower.created_at.desc())
        )
        if skip:
            stmt = stmt.offset(skip)
        if limit is not None:
            stmt = stmt.limit(limit)

        return list(db.scalars(stmt))

    @staticmethod
    def list_following_paginated(
        db: Session,
        user_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Follower], int, int, bool, bool]:
        page = max(1, int(page or 1))
        limit = max(1, min(int(limit or 20), 100))
        offset = (page - 1) * limit

        total = FollowerService.following_count(db, user_id)
        pages = max(1, (total + limit - 1) // limit) if total > 0 else 1

        items = FollowerService.list_following(
            db=db,
            user_id=user_id,
            skip=offset,
            limit=limit,
        )

        has_next = page < pages
        has_prev = page > 1

        return items, total, pages, has_next, has_prev

    @staticmethod
    def follower_count(
        db: Session,
        user_id: uuid.UUID,
    ) -> int:

        stmt = (
            select(func.count())
            .select_from(Follower)
            .where(Follower.following_id == user_id)
        )

        return db.scalar(stmt) or 0

    @staticmethod
    def following_count(
        db: Session,
        user_id: uuid.UUID,
    ) -> int:

        stmt = (
            select(func.count())
            .select_from(Follower)
            .where(Follower.follower_id == user_id)
        )

        return db.scalar(stmt) or 0

    @staticmethod
    def mutual_followers(
        db: Session,
        user_a: uuid.UUID,
        user_b: uuid.UUID,
    ) -> list[Follower]:

        user_a_following = {
            relation.following_id
            for relation in db.scalars(
                select(Follower).where(Follower.follower_id == user_a)
            )
        }

        stmt = select(Follower).where(Follower.follower_id == user_b)

        return [
            relation
            for relation in db.scalars(stmt)
            if relation.following_id in user_a_following
        ]

    @staticmethod
    def unfollow_user(
        db: Session,
        relationship: Follower,
    ) -> None:

        db.delete(relationship)
        db.flush()
