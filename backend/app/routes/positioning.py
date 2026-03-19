from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone
import json

from ..database import get_db
from ..models import PositioningStrategy
from ..services.claude_service import analyze_positioning_strategy
from ..services.auth_service import get_current_user, User

router = APIRouter(prefix="/positioning", tags=["positioning"])


class PositioningInput(BaseModel):
    target_audience: str
    competitors: str | None = None
    value_proposition: str


@router.get("/")
def get_positioning(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the current user's positioning strategy."""
    strategy = (
        db.query(PositioningStrategy)
        .filter(PositioningStrategy.user_id == current_user.id)
        .order_by(PositioningStrategy.created_at.desc())
        .first()
    )
    if not strategy:
        return None

    analysis = {}
    if strategy.ai_analysis:
        try:
            analysis = json.loads(strategy.ai_analysis)
        except json.JSONDecodeError:
            pass

    return {
        "id": strategy.id,
        "target_audience": strategy.target_audience,
        "competitors": strategy.competitors,
        "value_proposition": strategy.value_proposition,
        "analysis": analysis,
        "created_at": strategy.created_at.isoformat(),
        "updated_at": strategy.updated_at.isoformat() if strategy.updated_at else None,
    }


@router.post("/")
def save_positioning(
    data: PositioningInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates or updates the user's positioning strategy and runs AI analysis."""
    analysis = analyze_positioning_strategy(
        target_audience=data.target_audience,
        competitors=data.competitors,
        value_proposition=data.value_proposition,
    )

    existing = (
        db.query(PositioningStrategy)
        .filter(PositioningStrategy.user_id == current_user.id)
        .order_by(PositioningStrategy.created_at.desc())
        .first()
    )

    if existing:
        existing.target_audience = data.target_audience
        existing.competitors = data.competitors
        existing.value_proposition = data.value_proposition
        existing.ai_analysis = json.dumps(analysis, ensure_ascii=False)
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        strategy = existing
    else:
        strategy = PositioningStrategy(
            user_id=current_user.id,
            target_audience=data.target_audience,
            competitors=data.competitors,
            value_proposition=data.value_proposition,
            ai_analysis=json.dumps(analysis, ensure_ascii=False),
        )
        db.add(strategy)
        db.commit()
        db.refresh(strategy)

    return {
        "id": strategy.id,
        "target_audience": strategy.target_audience,
        "competitors": strategy.competitors,
        "value_proposition": strategy.value_proposition,
        "analysis": analysis,
        "created_at": strategy.created_at.isoformat(),
        "updated_at": strategy.updated_at.isoformat() if strategy.updated_at else None,
    }


@router.delete("/")
def delete_positioning(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes the user's positioning strategy."""
    strategies = (
        db.query(PositioningStrategy)
        .filter(PositioningStrategy.user_id == current_user.id)
        .all()
    )
    if not strategies:
        raise HTTPException(status_code=404, detail="Nenhuma estratégia encontrada")

    for s in strategies:
        db.delete(s)
    db.commit()
    return {"message": "Estratégia de posicionamento removida"}
