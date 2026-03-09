from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import json

from ..database import get_db
from ..models import InboxItem, Project
from ..services.vision_service import analyze_image_for_tasks, classify_whatsapp_message

router = APIRouter(prefix="/capture", tags=["capture"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
}

MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB


# ─── Image Upload ─────────────────────────────────────────────────────────────

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Receives a screenshot/image, uses Claude Vision to extract all
    tasks and demands visible in the image, and adds them to the inbox.
    """
    content_type = file.content_type or ""
    mime_type = ALLOWED_IMAGE_TYPES.get(content_type)
    if not mime_type:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo não suportado: {content_type}. Use JPEG, PNG, WebP ou GIF.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Imagem muito grande. Máximo 20 MB.")
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    analysis = analyze_image_for_tasks(image_bytes, mime_type)

    if not analysis.get("items"):
        return {
            "added": 0,
            "source_type": analysis.get("source_type", "other"),
            "summary": analysis.get("summary", "Nenhuma demanda encontrada na imagem."),
            "items": [],
        }

    added_items = []
    for item_data in analysis["items"]:
        if not item_data.get("is_actionable") and item_data.get("list_type") == "trash":
            continue

        content = item_data.get("content", "")
        if not content:
            continue

        # Build a rich description including sender if available
        sender = item_data.get("sender")
        full_content = f"[{analysis.get('source_type', 'imagem').upper()}] "
        if sender:
            full_content += f"{sender}: "
        full_content += content

        # Store the GTD analysis as metadata in the content
        clarification_json = json.dumps(item_data, ensure_ascii=False)

        inbox_item = InboxItem(
            content=full_content,
            source=f"image:{analysis.get('source_type', 'other')}",
            status="clarified",  # Already clarified by Claude Vision
        )
        inbox_item.gtd_data = clarification_json  # Will be used in frontend
        db.add(inbox_item)
        db.flush()

        added_items.append({
            "id": inbox_item.id,
            "content": full_content,
            "clarification": item_data,
        })

    db.commit()

    return {
        "added": len(added_items),
        "source_type": analysis.get("source_type"),
        "summary": analysis.get("summary"),
        "items": added_items,
    }


# ─── WhatsApp Webhook ─────────────────────────────────────────────────────────

class WhatsAppMessage(BaseModel):
    message: str
    sender: str
    group_name: str
    timestamp: Optional[str] = None
    message_id: Optional[str] = None


class WhatsAppBatch(BaseModel):
    messages: list[WhatsAppMessage]


@router.post("/whatsapp")
async def receive_whatsapp_message(
    payload: WhatsAppMessage,
    db: Session = Depends(get_db),
):
    """
    Receives a single WhatsApp message from the bot,
    uses Claude to decide if it's relevant and classifies it GTD-style.
    """
    # Get active projects for context
    projects = db.query(Project).filter(Project.status == "active").all()
    project_names = [p.title for p in projects]

    classification = classify_whatsapp_message(
        message=payload.message,
        sender=payload.sender,
        group_name=payload.group_name,
        existing_projects=project_names,
    )

    if not classification.get("is_relevant"):
        return {"added": False, "reason": "Mensagem não contém demanda relevante"}

    content = classification.get("content") or payload.message
    full_content = f"[WHATSAPP/{payload.group_name}] {payload.sender}: {content}"

    inbox_item = InboxItem(
        content=full_content,
        source=f"whatsapp:{payload.group_name}",
        status="clarified",
    )
    db.add(inbox_item)
    db.commit()
    db.refresh(inbox_item)

    return {
        "added": True,
        "item_id": inbox_item.id,
        "content": full_content,
        "classification": classification,
    }


@router.post("/whatsapp/batch")
async def receive_whatsapp_batch(
    payload: WhatsAppBatch,
    db: Session = Depends(get_db),
):
    """
    Processes a batch of WhatsApp messages (e.g., catch-up after bot restart).
    """
    projects = db.query(Project).filter(Project.status == "active").all()
    project_names = [p.title for p in projects]

    added = 0
    skipped = 0
    results = []

    for msg in payload.messages:
        classification = classify_whatsapp_message(
            message=msg.message,
            sender=msg.sender,
            group_name=msg.group_name,
            existing_projects=project_names,
        )

        if not classification.get("is_relevant"):
            skipped += 1
            continue

        content = classification.get("content") or msg.message
        full_content = f"[WHATSAPP/{msg.group_name}] {msg.sender}: {content}"

        inbox_item = InboxItem(
            content=full_content,
            source=f"whatsapp:{msg.group_name}",
            status="clarified",
        )
        db.add(inbox_item)
        db.flush()
        added += 1
        results.append({"id": inbox_item.id, "content": full_content})

    db.commit()
    return {"added": added, "skipped": skipped, "items": results}


# ─── WhatsApp Config ──────────────────────────────────────────────────────────

@router.get("/whatsapp/status")
def whatsapp_status():
    """Returns current WhatsApp bot connection status."""
    return {
        "info": "Consulte o serviço do bot em http://localhost:3001/status",
        "bot_url": "http://localhost:3001",
    }
