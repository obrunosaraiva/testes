from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from ..database import get_db
from ..models import Task, Project
from ..services.claude_service import build_user_context_profile
from ..services.auth_service import get_current_user, User

router = APIRouter(prefix="/ai", tags=["ai"])

# Simple in-memory cache (per user, 30-min TTL)
_profile_cache: dict[int, tuple[float, dict]] = {}
_CACHE_TTL_SECONDS = 30 * 60


@router.get("/profile")
def get_ai_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the manager's behavioral profile derived from task history."""
    now = datetime.now(timezone.utc).timestamp()
    cached = _profile_cache.get(current_user.id)
    if cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
        return cached[1]

    tasks = db.query(Task).order_by(Task.created_at.desc()).limit(200).all()
    projects = db.query(Project).filter(Project.status == "active").all()

    task_dicts = [
        {
            "title": t.title,
            "list_type": t.list_type,
            "context": t.context,
            "assigned_to": t.assigned_to,
            "priority": t.priority,
            "project_id": t.project_id,
        }
        for t in tasks
    ]
    project_names = [p.title for p in projects]

    profile = build_user_context_profile(task_dicts, project_names)
    _profile_cache[current_user.id] = (now, profile)
    return profile
