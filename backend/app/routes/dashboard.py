from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from ..database import get_db
from ..models import InboxItem, Task, Project, WeeklyReview
from ..services.claude_service import generate_weekly_review_insights

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
def get_dashboard(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_end = now.replace(hour=23, minute=59, second=59)

    # Inbox count
    inbox_count = db.query(InboxItem).filter(InboxItem.status == "pending").count()

    # Decisions needed today (urgent + high priority next actions)
    decisions_needed = db.query(Task).filter(
        Task.list_type.in_(["next_action", "calendar"]),
        Task.status == "pending",
        Task.priority.in_(["urgent", "high"]),
    ).all()

    # Waiting items - overdue
    waiting_items = db.query(Task).filter(
        Task.list_type == "waiting",
        Task.status == "pending",
    ).all()

    overdue_waiting = []
    waiting_list = []
    for t in waiting_items:
        days_waiting = (now - t.waiting_since.replace(tzinfo=timezone.utc)).days if t.waiting_since else 0
        item_data = {
            "id": t.id,
            "title": t.title,
            "assigned_to": t.assigned_to,
            "days_waiting": days_waiting,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "priority": t.priority,
        }
        if t.due_date and t.due_date.replace(tzinfo=timezone.utc) < now:
            overdue_waiting.append(item_data)
        elif days_waiting >= 3:
            overdue_waiting.append(item_data)
        else:
            waiting_list.append(item_data)

    # Next actions available (grouped by context)
    next_actions = db.query(Task).filter(
        Task.list_type == "next_action",
        Task.status == "pending",
    ).order_by(Task.priority.desc()).all()

    contexts = {}
    for t in next_actions:
        ctx = t.context or "@geral"
        if ctx not in contexts:
            contexts[ctx] = []
        contexts[ctx].append({
            "id": t.id,
            "title": t.title,
            "priority": t.priority,
            "project_id": t.project_id,
            "due_date": t.due_date.isoformat() if t.due_date else None,
        })

    # Projects status
    projects = db.query(Project).filter(Project.status == "active").all()
    projects_data = []
    for p in projects:
        pending_tasks = db.query(Task).filter(
            Task.project_id == p.id,
            Task.status == "pending"
        ).all()
        has_next_action = any(t.list_type == "next_action" for t in pending_tasks)
        days_to_deadline = None
        if p.deadline:
            deadline = p.deadline.replace(tzinfo=timezone.utc) if p.deadline.tzinfo is None else p.deadline
            days_to_deadline = (deadline - now).days

        projects_data.append({
            "id": p.id,
            "title": p.title,
            "completion_pct": p.completion_pct,
            "has_next_action": has_next_action,
            "days_to_deadline": days_to_deadline,
            "pending_tasks": len(pending_tasks),
            "alert": not has_next_action or (days_to_deadline is not None and days_to_deadline <= 7),
        })

    # Completed today
    completed_today = db.query(Task).filter(
        Task.status == "done",
        Task.completed_at >= now.replace(hour=0, minute=0, second=0),
    ).count()

    return {
        "inbox_count": inbox_count,
        "decisions_needed": [
            {
                "id": t.id,
                "title": t.title,
                "priority": t.priority,
                "context": t.context,
                "due_date": t.due_date.isoformat() if t.due_date else None,
            }
            for t in decisions_needed
        ],
        "overdue_waiting": overdue_waiting,
        "waiting_list": waiting_list,
        "next_actions_by_context": contexts,
        "projects": projects_data,
        "completed_today": completed_today,
        "total_next_actions": len(next_actions),
        "total_waiting": len(waiting_items),
    }


@router.get("/weekly-review")
def get_weekly_review_data(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)

    # Items waiting more than 5 days
    five_days_ago = now - timedelta(days=5)
    overdue_waiting = db.query(Task).filter(
        Task.list_type == "waiting",
        Task.status == "pending",
        Task.waiting_since <= five_days_ago,
    ).all()

    # Projects without next action
    projects = db.query(Project).filter(Project.status == "active").all()
    projects_without_next_action = []
    for p in projects:
        has_next = db.query(Task).filter(
            Task.project_id == p.id,
            Task.list_type == "next_action",
            Task.status == "pending",
        ).first()
        if not has_next:
            projects_without_next_action.append({"id": p.id, "title": p.title})

    # Someday/maybe items
    someday_items = db.query(Task).filter(
        Task.list_type == "someday",
        Task.status == "pending",
    ).all()

    # Completed this week
    week_start = now - timedelta(days=7)
    completed_this_week = db.query(Task).filter(
        Task.status == "done",
        Task.completed_at >= week_start,
    ).all()

    return {
        "overdue_waiting": [
            {
                "title": t.title,
                "assigned_to": t.assigned_to,
                "days": (now - t.waiting_since.replace(tzinfo=timezone.utc)).days if t.waiting_since else 0,
            }
            for t in overdue_waiting
        ],
        "projects_without_next_action": projects_without_next_action,
        "someday_items": [{"id": t.id, "title": t.title} for t in someday_items],
        "completed_this_week": [{"title": t.title} for t in completed_this_week],
        "inbox_count": db.query(InboxItem).filter(InboxItem.status == "pending").count(),
    }


@router.post("/weekly-review/insights")
def get_review_insights(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    five_days_ago = now - timedelta(days=5)
    week_start = now - timedelta(days=7)

    overdue_waiting = db.query(Task).filter(
        Task.list_type == "waiting",
        Task.status == "pending",
        Task.waiting_since <= five_days_ago,
    ).all()

    projects = db.query(Project).filter(Project.status == "active").all()
    projects_without_next_action = []
    for p in projects:
        has_next = db.query(Task).filter(
            Task.project_id == p.id,
            Task.list_type == "next_action",
            Task.status == "pending",
        ).first()
        if not has_next:
            projects_without_next_action.append({"title": p.title})

    someday_items = db.query(Task).filter(
        Task.list_type == "someday", Task.status == "pending"
    ).all()

    completed_this_week = db.query(Task).filter(
        Task.status == "done", Task.completed_at >= week_start
    ).all()

    insights = generate_weekly_review_insights(
        overdue_waiting=[{"title": t.title, "assigned_to": t.assigned_to} for t in overdue_waiting],
        projects_without_next_action=projects_without_next_action,
        someday_items=[{"title": t.title} for t in someday_items],
        completed_this_week=[{"title": t.title} for t in completed_this_week],
    )

    return {"insights": insights}
