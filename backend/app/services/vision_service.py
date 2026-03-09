import anthropic
import base64
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

VISION_SYSTEM_PROMPT = """Você é um especialista em GTD (Getting Things Done) com visão computacional.
Analise a imagem fornecida — pode ser um print de WhatsApp, Slack, e-mail, reunião, post-it, etc.

Extraia TODAS as demandas, tarefas, pedidos, decisões e compromissos visíveis na imagem.
Para cada item encontrado, aplique o método GTD e retorne dados estruturados.

Retorne APENAS um JSON válido com esta estrutura:
{
  "source_type": "whatsapp" | "slack" | "email" | "meeting" | "document" | "other",
  "source_description": "descrição breve do que é a imagem",
  "items": [
    {
      "content": "texto original ou resumo do item capturado",
      "sender": "nome do remetente se visível, ou null",
      "is_actionable": boolean,
      "list_type": "next_action" | "waiting" | "someday" | "reference" | "trash" | "calendar",
      "next_action": "próxima ação física e concreta com verbo de ação",
      "context": "@reunião" | "@email" | "@decisão" | "@leitura" | "@telefone" | "@computador" | null,
      "priority": "urgent" | "high" | "medium" | "low",
      "project_suggestion": "nome de projeto relacionado ou null",
      "delegate_to": "para quem delegar se aplicável ou null",
      "due_date": "prazo em formato ISO se mencionado ou null",
      "clarification": "explicação em 1 frase do que foi decidido"
    }
  ],
  "summary": "resumo em 1-2 frases do que foi encontrado na imagem"
}

Se a imagem não contiver demandas claras, retorne items como lista vazia."""


def analyze_image_for_tasks(image_bytes: bytes, mime_type: str) -> dict:
    """
    Analyzes an image (screenshot) using Claude Vision to extract GTD tasks.
    """
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=VISION_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Analise esta imagem e extraia todas as demandas e tarefas usando o método GTD. Retorne apenas o JSON.",
                    },
                ],
            }
        ],
    ) as stream:
        final_message = stream.get_final_message()

    text_content = ""
    for block in final_message.content:
        if block.type == "text":
            text_content = block.text
            break

    try:
        text_content = text_content.strip()
        if text_content.startswith("```"):
            text_content = text_content.split("```")[1]
            if text_content.startswith("json"):
                text_content = text_content[4:]
        return json.loads(text_content)
    except json.JSONDecodeError:
        return {
            "source_type": "other",
            "source_description": "Imagem não processada",
            "items": [],
            "summary": "Não foi possível extrair tarefas da imagem.",
        }


def classify_whatsapp_message(
    message: str,
    sender: str,
    group_name: str,
    existing_projects: list[str] = None,
) -> dict:
    """
    Classifies a single WhatsApp message using GTD methodology.
    Returns structured task data or None if the message is not actionable.
    """
    projects_context = ""
    if existing_projects:
        projects_context = f"\nProjetos ativos: {', '.join(existing_projects)}"

    prompt = f"""Mensagem do WhatsApp:
Grupo: {group_name}
Remetente: {sender}
Mensagem: "{message}"{projects_context}

Esta mensagem contém uma demanda, pedido, tarefa ou compromisso para o gestor?
Se sim, classifique com GTD. Se não (conversa casual, emoji, confirmação simples), retorne is_relevant: false.

Retorne APENAS JSON:
{{
  "is_relevant": boolean,
  "content": "resumo claro da demanda ou null",
  "sender": "{sender}",
  "is_actionable": boolean,
  "list_type": "next_action" | "waiting" | "someday" | "reference" | "trash",
  "next_action": "próxima ação física com verbo concreto ou null",
  "context": "@reunião" | "@email" | "@decisão" | "@leitura" | "@telefone" | "@computador" | null,
  "priority": "urgent" | "high" | "medium" | "low",
  "project_suggestion": "projeto relacionado ou null",
  "delegate_to": "null",
  "due_date": "prazo ISO se mencionado ou null",
  "clarification": "1 frase explicando a decisão GTD"
}}"""

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    try:
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except json.JSONDecodeError:
        return {"is_relevant": False}
