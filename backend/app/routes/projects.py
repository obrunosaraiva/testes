from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from ..database import get_db
from ..models import Project, Task
from ..services.claude_service import suggest_next_action_for_project, decompose_project

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[str] = None


@router.get("/")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    result = []
    for p in projects:
        tasks = db.query(Task).filter(Task.project_id == p.id, Task.status == "pending").all()
        has_next_action = any(t.list_type == "next_action" for t in tasks)
        result.append({
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "status": p.status,
            "completion_pct": p.completion_pct,
            "deadline": p.deadline.isoformat() if p.deadline else None,
            "created_at": p.created_at.isoformat(),
            "task_count": len(tasks),
            "has_next_action": has_next_action,
        })
    return result


@router.post("/")
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    deadline = None
    if project.deadline:
        try:
            deadline = datetime.fromisoformat(project.deadline.replace("Z", "+00:00"))
        except ValueError:
            pass

    new_project = Project(
        title=project.title,
        description=project.description,
        deadline=deadline,
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return {"id": new_project.id, "title": new_project.title}


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(Task).filter(Task.project_id == project_id).order_by(Task.created_at.asc()).all()
    return {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "status": project.status,
        "completion_pct": project.completion_pct,
        "deadline": project.deadline.isoformat() if project.deadline else None,
        "created_at": project.created_at.isoformat(),
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "list_type": t.list_type,
                "status": t.status,
                "priority": t.priority,
                "context": t.context,
                "assigned_to": t.assigned_to,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "waiting_since": t.waiting_since.isoformat() if t.waiting_since else None,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            }
            for t in tasks
        ],
    }


class QuickTaskCreate(BaseModel):
    title: str
    list_type: str = "next_action"
    context: Optional[str] = None
    priority: str = "medium"
    assigned_to: Optional[str] = None


@router.post("/{project_id}/tasks")
def add_task_to_project(project_id: int, task: QuickTaskCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from datetime import timezone
    new_task = Task(
        title=task.title,
        list_type=task.list_type,
        context=task.context,
        priority=task.priority,
        project_id=project_id,
        assigned_to=task.assigned_to,
        waiting_since=datetime.now(timezone.utc) if task.list_type == "waiting" else None,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return {"id": new_task.id, "title": new_task.title, "list_type": new_task.list_type}


@router.patch("/{project_id}")
def update_project(project_id: int, update: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if update.title is not None:
        project.title = update.title
    if update.description is not None:
        project.description = update.description
    if update.status is not None:
        project.status = update.status
    if update.deadline is not None:
        try:
            project.deadline = datetime.fromisoformat(update.deadline.replace("Z", "+00:00"))
        except ValueError:
            pass

    db.commit()
    db.refresh(project)
    return {"id": project.id, "title": project.title, "status": project.status}


@router.get("/{project_id}/suggest-next-action")
def suggest_next_action(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(Task).filter(Task.project_id == project_id, Task.status == "pending").all()
    tasks_data = [{"title": t.title, "list_type": t.list_type, "context": t.context} for t in tasks]

    suggestion = suggest_next_action_for_project(
        project.title, project.description or "", tasks_data
    )
    return {"suggestion": suggestion}


@router.post("/{project_id}/decompose")
def decompose(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    other_projects = db.query(Project).filter(
        Project.status == "active", Project.id != project_id
    ).all()
    existing_project_names = [p.title for p in other_projects]

    deadline_str = project.deadline.strftime("%d/%m/%Y") if project.deadline else None

    task_dicts = decompose_project(
        project_title=project.title,
        project_description=project.description or "",
        deadline=deadline_str,
        existing_projects=existing_project_names,
    )

    created = []
    for i, td in enumerate(task_dicts):
        task = Task(
            title=td.get("title", "Tarefa sem título"),
            description=td.get("notes"),
            list_type=td.get("list_type", "next_action"),
            context=td.get("context"),
            priority=td.get("priority", "medium"),
            project_id=project_id,
            assigned_to=td.get("assigned_to"),
            waiting_since=datetime.now() if td.get("list_type") == "waiting" else None,
        )
        db.add(task)
        db.flush()
        created.append({
            "id": task.id,
            "title": task.title,
            "list_type": task.list_type,
            "context": task.context,
            "priority": task.priority,
            "assigned_to": task.assigned_to,
        })

    db.commit()
    return {"project_id": project_id, "tasks_created": len(created), "tasks": created}
