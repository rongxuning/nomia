import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.activity import ActivityLog
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.activity import ActivityOut

router = APIRouter(prefix="/workspaces/{workspace_id}/activity", tags=["activity"])


def _require_member(db: Session, workspace_id: uuid.UUID, user: User) -> WorkspaceMember:
    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.status == "active",
        )
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_a_member")
    return member


@router.get("", response_model=list[ActivityOut])
def list_activity(
    workspace_id: uuid.UUID,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_member(db, workspace_id, user)
    rows = db.scalars(
        select(ActivityLog)
        .where(ActivityLog.workspace_id == workspace_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(min(limit, 200))
    ).all()
    return [
        ActivityOut(
            id=str(a.id),
            actor_user_id=str(a.actor_user_id),
            entity_type=a.entity_type,
            entity_id=str(a.entity_id),
            action=a.action,
            metadata=a.meta,
            created_at=a.created_at,
        )
        for a in rows
    ]

