from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.item import Item
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.me import MyItemOut

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/items", response_model=list[MyItemOut])
def list_my_items(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """All items across workspaces where the current user is an active member."""
    rows = db.execute(
        select(Item, Project, Workspace)
        .join(Project, Project.id == Item.project_id)
        .join(Workspace, Workspace.id == Item.workspace_id)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Item.workspace_id)
        .where(
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.status == "active",
        )
        .order_by(Item.created_at.desc())
    ).all()

    return [
        MyItemOut(
            id=str(i.id),
            title=i.title,
            body=i.body,
            status=i.status,
            priority=i.priority,
            start_at=i.start_at,
            end_at=i.end_at,
            details=i.details,
            version=i.version,
            workspace_id=str(w.id),
            workspace_name=w.name,
            project_id=str(p.id),
            project_name=p.name,
        )
        for i, p, w in rows
    ]
