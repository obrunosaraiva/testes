from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Task, Project, InboxItem

router = APIRouter(prefix="/search", tags=["search"])

LIST_LABEL = {
    "next_action": "Próximas Ações",
    "waiting": "Aguardando",
    "someday": "Algum Dia",
    "reference": "Referência",
    "calendar": "Agenda",
    "trash": "Lixo",
}

PAGE_FOR_LIST = {
    "next_action": "next-actions",
    "waiting": "waiting",
    "someday": "someday",
    "reference": "someday",
    "calendar": "someday",
}


@router.get("/")
def search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    q = q.strip()
    if not q:
        return {"tasks": [], "projects": [], "inbox": []}

    term = f"%{q}%"

    tasks = (
        db.query(Task)
        .filter(
            Task.status == "pending",
            or_(
                Task.title.ilike(term),
                Task.description.ilike(term),
                Task.context.ilike(term),
                Task.assigned_to.ilike(term),
            ),
        )
        .order_by(Task.created_at.desc())
        .limit(8)
        .all()
    )

    projects = (
        db.query(Project)
        .filter(
            or_(
                Project.title.ilike(term),
                Project.description.ilike(term),
            )
        )
        .order_by(Project.created_at.desc())
        .limit(5)
        .all()
    )

    inbox = (
        db.query(InboxItem)
        .filter(
            InboxItem.status == "pending",
            InboxItem.content.ilike(term),
        )
        .order_by(InboxItem.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "list_type": t.list_type,
                "list_label": LIST_LABEL.get(t.list_type, t.list_type),
                "page": PAGE_FOR_LIST.get(t.list_type, "next-actions"),
                "context": t.context,
                "priority": t.priority,
            }
            for t in tasks
        ],
        "projects": [
            {
                "id": p.id,
                "title": p.title,
                "status": p.status,
                "completion_pct": p.completion_pct,
            }
            for p in projects
        ],
        "inbox": [
            {
                "id": i.id,
                "content": i.content,
                "source": i.source,
            }
            for i in inbox
        ],
    }
