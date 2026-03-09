from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from ..database import get_db
from ..models import InboxItem, Task, Project
from ..services.auth_service import get_current_user, User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    alerts = []

    # 1. Inbox overflowing (> 5 items)
    inbox_count = db.query(InboxItem).filter(InboxItem.status == "pending").count()
    if inbox_count > 0:
        alerts.append({
            "id": "inbox",
            "type": "inbox",
            "severity": "high" if inbox_count > 5 else "medium",
            "title": f"{inbox_count} {'item' if inbox_count == 1 else 'itens'} na caixa de entrada",
            "body": "Processe a inbox para manter o sistema GTD funcionando.",
            "action": "inbox",
        })

    # 2. Overdue waiting items (> 3 days with no deadline, or past deadline)
    waiting = db.query(Task).filter(
        Task.list_type == "waiting",
        Task.status == "pending",
    ).all()
    for t in waiting:
        days = 0
        overdue_by_deadline = False
        if t.waiting_since:
            days = (now - t.waiting_since.replace(tzinfo=timezone.utc)).days
        if t.due_date and t.due_date.replace(tzinfo=timezone.utc) < now:
            overdue_by_deadline = True

        if overdue_by_deadline:
            alerts.append({
                "id": f"waiting-deadline-{t.id}",
                "type": "waiting_overdue",
                "severity": "urgent",
                "title": f"Prazo vencido: {t.title[:50]}",
                "body": f"Aguardando {t.assigned_to or 'retorno'} — prazo já passou.",
                "action": "waiting",
                "task_id": t.id,
            })
        elif days >= 5:
            alerts.append({
                "id": f"waiting-{t.id}",
                "type": "waiting_overdue",
                "severity": "high",
                "title": f"Cobrar: {t.title[:50]}",
                "body": f"{days} dias aguardando {t.assigned_to or 'retorno'}.",
                "action": "waiting",
                "task_id": t.id,
            })

    # 3. Projects without a next action
    projects = db.query(Project).filter(Project.status == "active").all()
    for p in projects:
        has_next = db.query(Task).filter(
            Task.project_id == p.id,
            Task.list_type == "next_action",
            Task.status == "pending",
        ).first()
        if not has_next:
            alerts.append({
                "id": f"project-no-action-{p.id}",
                "type": "project_stalled",
                "severity": "high",
                "title": f"Projeto parado: {p.title[:50]}",
                "body": "Nenhuma próxima ação definida. O projeto vai travar.",
                "action": "projects",
                "project_id": p.id,
            })

    # 4. Projects nearing deadline (≤ 7 days)
    for p in projects:
        if p.deadline:
            deadline = p.deadline.replace(tzinfo=timezone.utc) if p.deadline.tzinfo is None else p.deadline
            days_left = (deadline - now).days
            if 0 <= days_left <= 7:
                alerts.append({
                    "id": f"project-deadline-{p.id}",
                    "type": "project_deadline",
                    "severity": "urgent" if days_left <= 2 else "high",
                    "title": f"Deadline próximo: {p.title[:50]}",
                    "body": f"Faltam {days_left} {'dia' if days_left == 1 else 'dias'} — {p.completion_pct:.0f}% concluído.",
                    "action": "projects",
                    "project_id": p.id,
                })

    # Sort: urgent first, then high, then medium
    severity_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 9))

    return {"count": len(alerts), "alerts": alerts}
