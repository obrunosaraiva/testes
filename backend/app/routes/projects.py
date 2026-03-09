from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from ..database import get_db
from ..models import Project, Task
from ..services.claude_service import suggest_next_action_for_project

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

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
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
            }
            for t in tasks
        ],
    }


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
