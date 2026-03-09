from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

from ..database import get_db
from ..models import Task, Project, TaskStatus

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    context: Optional[str] = None
    priority: Optional[str] = None
    project_id: Optional[int] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    decision_rationale: Optional[str] = None


@router.get("/")
def list_tasks(list_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Task).filter(Task.status == "pending")
    if list_type:
        query = query.filter(Task.list_type == list_type)
    tasks = query.order_by(Task.priority.desc(), Task.created_at.asc()).all()

    return [_task_to_dict(t) for t in tasks]


@router.get("/by-context/{context}")
def tasks_by_context(context: str, db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(
        Task.context == context,
        Task.status == "pending",
        Task.list_type == "next_action"
    ).all()
    return [_task_to_dict(t) for t in tasks]


@router.patch("/{task_id}")
def update_task(task_id: int, update: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if update.title is not None:
        task.title = update.title
    if update.context is not None:
        task.context = update.context
    if update.priority is not None:
        task.priority = update.priority
    if update.project_id is not None:
        task.project_id = update.project_id
    if update.assigned_to is not None:
        task.assigned_to = update.assigned_to
    if update.decision_rationale is not None:
        task.decision_rationale = update.decision_rationale
    if update.due_date is not None:
        try:
            task.due_date = datetime.fromisoformat(update.due_date.replace("Z", "+00:00"))
        except ValueError:
            pass
    if update.status is not None:
        task.status = update.status
        if update.status == "done":
            task.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(task)
    return _task_to_dict(task)


@router.post("/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "done"
    task.completed_at = datetime.now(timezone.utc)

    # Update project completion if applicable
    if task.project_id:
        project = db.query(Project).filter(Project.id == task.project_id).first()
        if project:
            total = db.query(Task).filter(Task.project_id == project.id).count()
            done = db.query(Task).filter(Task.project_id == project.id, Task.status == "done").count() + 1
            project.completion_pct = round((done / total) * 100, 1) if total > 0 else 0

    db.commit()
    return {"message": "Tarefa concluída"}


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Tarefa removida"}


def _task_to_dict(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "list_type": task.list_type,
        "context": task.context,
        "status": task.status,
        "priority": task.priority,
        "project_id": task.project_id,
        "assigned_to": task.assigned_to,
        "waiting_since": task.waiting_since.isoformat() if task.waiting_since else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "decision_rationale": task.decision_rationale,
        "created_at": task.created_at.isoformat(),
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }
