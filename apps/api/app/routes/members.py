import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.workspace import MemberAdd, MemberOut, MemberRoleUpdate
from app.services.activity import log_activity

router = APIRouter(prefix="/workspaces/{workspace_id}/members", tags=["members"])


def _require_admin_or_owner(db: Session, workspace_id: uuid.UUID, user: User) -> WorkspaceMember:
    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.status == "active",
        )
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_a_member")
    if member.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient_role")
    return member


@router.get("", response_model=list[MemberOut])
def list_members(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # any member can list members (common in collaboration tools)
    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.status == "active",
        )
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_a_member")

    rows = db.execute(
        select(WorkspaceMember, User)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .order_by(WorkspaceMember.created_at.asc())
    ).all()
    out: list[MemberOut] = []
    for m, u in rows:
        out.append(
            MemberOut(
                id=str(m.id),
                user_id=str(u.id),
                email=u.email,
                display_name=u.display_name,
                role=m.role,
                status=m.status,
            )
        )
    return out


@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def add_member(
    workspace_id: uuid.UUID,
    payload: MemberAdd,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_owner(db, workspace_id, user)

    email = payload.email.strip().lower()
    target_user = db.scalar(select(User).where(User.email == email))
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    existing = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == target_user.id,
        )
    )
    if existing and existing.status == "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="already_member")

    if existing:
        existing.status = "active"
        existing.role = payload.role
        member_row = existing
    else:
        member_row = WorkspaceMember(
            workspace_id=workspace_id, user_id=target_user.id, role=payload.role, status="active"
        )
        db.add(member_row)
        db.flush()

    log_activity(
        db,
        workspace_id=workspace_id,
        actor_user_id=user.id,
        entity_type="member",
        entity_id=member_row.id,
        action="add_member",
        metadata={"user_id": str(target_user.id), "role": payload.role},
    )
    db.commit()
    return MemberOut(
        id=str(member_row.id),
        user_id=str(target_user.id),
        email=target_user.email,
        display_name=target_user.display_name,
        role=member_row.role,
        status=member_row.status,
    )


@router.patch("/{member_id}", response_model=MemberOut)
def update_member_role(
    workspace_id: uuid.UUID,
    member_id: uuid.UUID,
    payload: MemberRoleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_owner(db, workspace_id, user)
    m = db.get(WorkspaceMember, member_id)
    if not m or m.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    m.role = payload.role
    log_activity(
        db,
        workspace_id=workspace_id,
        actor_user_id=user.id,
        entity_type="member",
        entity_id=m.id,
        action="change_role",
        metadata={"role": payload.role, "user_id": str(m.user_id)},
    )
    db.commit()

    u = db.get(User, m.user_id)
    return MemberOut(
        id=str(m.id),
        user_id=str(m.user_id),
        email=u.email if u else "unknown@example.com",
        display_name=u.display_name if u else "Unknown",
        role=m.role,
        status=m.status,
    )


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    workspace_id: uuid.UUID,
    member_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_or_owner(db, workspace_id, user)
    m = db.get(WorkspaceMember, member_id)
    if not m or m.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    m.status = "removed"
    log_activity(
        db,
        workspace_id=workspace_id,
        actor_user_id=user.id,
        entity_type="member",
        entity_id=m.id,
        action="remove_member",
        metadata={"user_id": str(m.user_id)},
    )
    db.commit()
    return None

