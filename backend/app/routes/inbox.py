from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

from ..database import get_db
from ..models import InboxItem, Project, Task
from ..services.claude_service import clarify_inbox_item

router = APIRouter(prefix="/inbox", tags=["inbox"])


class InboxCreate(BaseModel):
    content: str
    source: str = "manual"


class ProcessItemRequest(BaseModel):
    list_type: str
    next_action: str
    context: Optional[str] = None
    priority: str = "medium"
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    assigned_to: Optional[str] = None
    waiting_deadline: Optional[str] = None
    due_date: Optional[str] = None
    decision_rationale: Optional[str] = None


@router.get("/")
def list_inbox(db: Session = Depends(get_db)):
    items = db.query(InboxItem).filter(InboxItem.status != "processed").order_by(InboxItem.created_at.desc()).all()
    return [
        {
            "id": item.id,
            "content": item.content,
            "source": item.source,
            "status": item.status,
            "created_at": item.created_at.isoformat(),
        }
        for item in items
    ]


@router.post("/")
def add_to_inbox(item: InboxCreate, db: Session = Depends(get_db)):
    new_item = InboxItem(content=item.content, source=item.source)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"id": new_item.id, "content": new_item.content, "status": new_item.status}


@router.post("/{item_id}/clarify")
def clarify_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(InboxItem).filter(InboxItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Get existing projects for context
    projects = db.query(Project).filter(Project.status == "active").all()
    project_names = [p.title for p in projects]

    # Call Claude to clarify
    clarification = clarify_inbox_item(item.content, project_names)

    item.status = "clarified"
    db.commit()

    return {"item_id": item_id, "content": item.content, "clarification": clarification}


@router.post("/{item_id}/process")
def process_item(item_id: int, request: ProcessItemRequest, db: Session = Depends(get_db)):
    item = db.query(InboxItem).filter(InboxItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Handle project creation/lookup
    project_id = request.project_id
    if request.project_name and not project_id:
        project = db.query(Project).filter(Project.title == request.project_name).first()
        if not project:
            project = Project(title=request.project_name, status="active")
            db.add(project)
            db.flush()
        project_id = project.id

    # Parse dates
    waiting_deadline = None
    if request.waiting_deadline:
        try:
            waiting_deadline = datetime.fromisoformat(request.waiting_deadline.replace("Z", "+00:00"))
        except ValueError:
            pass

    due_date = None
    if request.due_date:
        try:
            due_date = datetime.fromisoformat(request.due_date.replace("Z", "+00:00"))
        except ValueError:
            pass

    # Create task
    task = Task(
        title=request.next_action,
        description=item.content,
        list_type=request.list_type,
        context=request.context,
        priority=request.priority,
        project_id=project_id,
        assigned_to=request.assigned_to,
        waiting_since=datetime.now(timezone.utc) if request.list_type == "waiting" else None,
        due_date=due_date,
        decision_rationale=request.decision_rationale,
    )
    db.add(task)

    # Mark inbox item as processed
    item.status = "processed"
    db.commit()
    db.refresh(task)

    return {"task_id": task.id, "message": "Item processado com sucesso"}


@router.delete("/{item_id}")
def delete_inbox_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(InboxItem).filter(InboxItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.status = "processed"
    db.commit()
    return {"message": "Item removido"}
