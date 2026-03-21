from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
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


@router.get("/export")
def export_positioning_md(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the positioning strategy as a downloadable .md file."""
    strategy = (
        db.query(PositioningStrategy)
        .filter(PositioningStrategy.user_id == current_user.id)
        .order_by(PositioningStrategy.created_at.desc())
        .first()
    )
    if not strategy:
        raise HTTPException(status_code=404, detail="Nenhuma estratégia encontrada")

    a = {}
    if strategy.ai_analysis:
        try:
            a = json.loads(strategy.ai_analysis)
        except json.JSONDecodeError:
            pass

    updated = strategy.updated_at or strategy.created_at
    date_str = updated.strftime("%d/%m/%Y")

    actions_md = ""
    if a.get("recommended_actions"):
        actions_md = "\n".join(f"- [ ] {act}" for act in a["recommended_actions"])

    md = f"""# Posicionamento Estratégico — {current_user.name}
> Baseado nos princípios de Al Ries & Jack Trout · Gerado em {date_str}

---

## Verbal Nail

> **"{a.get('verbal_nail', '—')}"**

---

## Análise de Posicionamento

| Campo | Definição |
|---|---|
| **Categoria** | {a.get('category', '—')} |
| **Palavra a Ownar** | {a.get('word_to_own', '—')} |
| **Posição Disponível** | {a.get('open_position', '—')} |
| **Arquétipo de Marca** | {a.get('brand_archetype', '—')} |

---

## Declaração de Posicionamento

> "{a.get('positioning_statement', '—')}"

---

## Resumo Executivo

{a.get('summary', '—')}

---

## Vantagem Competitiva

{a.get('competitive_advantage', '—')}

## Alerta de Risco

{a.get('risk_alert', '—')}

---

## Ações Recomendadas

{actions_md}

---

## Dados Originais

**Público-alvo:** {strategy.target_audience}

**Concorrentes:** {strategy.competitors or 'Não informado'}

**Proposta de valor:** {strategy.value_proposition}
"""

    filename = f"posicionamento-{current_user.name.lower().replace(' ', '-')}.md"
    return Response(
        content=md,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
