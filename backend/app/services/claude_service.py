import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

GTD_SYSTEM_PROMPT = """Você é um assistente especialista no método GTD (Getting Things Done) para gestores de projetos.
Seu papel é ajudar a clarificar itens da caixa de entrada, determinando exatamente o que precisa ser feito com cada um.

Ao analisar um item, siga rigorosamente o fluxo GTD:
1. É acionável? (pode-se tomar alguma ação com isso?)
2. Se não acionável: é referência, algum dia/talvez, ou lixo?
3. Se acionável: leva menos de 2 minutos? → fazer agora
4. Se acionável e >2 min: pode ser delegado? → delegar com prazo de retorno
5. Se acionável, >2 min e não delegável: qual a próxima ação física e concreta?
6. Pertence a um projeto existente ou é uma tarefa isolada?
7. Qual o contexto? (@reunião, @email, @decisão, @leitura, @telefone, @computador)
8. Há prazo? É urgente?

Responda SEMPRE em JSON válido com esta estrutura exata:
{
  "is_actionable": boolean,
  "takes_less_than_2min": boolean,
  "can_delegate": boolean,
  "list_type": "next_action" | "waiting" | "someday" | "reference" | "trash" | "calendar",
  "next_action": "descrição clara e física da próxima ação (verbo concreto)",
  "context": "@reunião" | "@email" | "@decisão" | "@leitura" | "@telefone" | "@computador" | null,
  "priority": "urgent" | "high" | "medium" | "low",
  "project_suggestion": "nome do projeto ou null",
  "delegate_to": "quem pode fazer isso ou null",
  "waiting_deadline": "prazo para retorno em formato ISO ou null",
  "due_date": "prazo da tarefa em formato ISO ou null",
  "clarification": "explicação em português do que foi decidido e por quê, máximo 2 frases",
  "do_now": boolean,
  "additional_actions": ["lista de ações relacionadas sugeridas ou []"]
}"""


def clarify_inbox_item(content: str, existing_projects: list[str] = None) -> dict:
    """
    Uses Claude to clarify an inbox item following GTD methodology.
    Returns structured clarification data.
    """
    projects_context = ""
    if existing_projects:
        projects_context = f"\n\nProjetos ativos no momento: {', '.join(existing_projects)}"

    user_message = f"""Analise este item da caixa de entrada usando o método GTD:

"{content}"{projects_context}

Retorne APENAS o JSON com a análise GTD. Sem texto adicional."""

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=1024,
        thinking={"type": "adaptive"},
        system=GTD_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        final_message = stream.get_final_message()

    # Extract the text content (ignore thinking blocks)
    text_content = ""
    for block in final_message.content:
        if block.type == "text":
            text_content = block.text
            break

    # Parse JSON from response
    try:
        # Strip markdown code blocks if present
        text_content = text_content.strip()
        if text_content.startswith("```"):
            text_content = text_content.split("```")[1]
            if text_content.startswith("json"):
                text_content = text_content[4:]
        return json.loads(text_content)
    except json.JSONDecodeError:
        # Fallback if Claude doesn't return valid JSON
        return {
            "is_actionable": True,
            "takes_less_than_2min": False,
            "can_delegate": False,
            "list_type": "next_action",
            "next_action": content,
            "context": "@computador",
            "priority": "medium",
            "project_suggestion": None,
            "delegate_to": None,
            "waiting_deadline": None,
            "due_date": None,
            "clarification": "Não foi possível clarificar automaticamente. Revise manualmente.",
            "do_now": False,
            "additional_actions": [],
        }


def generate_weekly_review_insights(
    overdue_waiting: list[dict],
    projects_without_next_action: list[dict],
    someday_items: list[dict],
    completed_this_week: list[dict],
) -> str:
    """
    Generates insights and recommendations for the weekly review.
    """
    context = f"""
Dados da revisão semanal:

ITENS AGUARDANDO RETORNO VENCIDOS ({len(overdue_waiting)}):
{json.dumps(overdue_waiting, ensure_ascii=False, indent=2)}

PROJETOS SEM PRÓXIMA AÇÃO ({len(projects_without_next_action)}):
{json.dumps(projects_without_next_action, ensure_ascii=False, indent=2)}

ALGUM DIA/TALVEZ ({len(someday_items)} itens):
{json.dumps(someday_items, ensure_ascii=False, indent=2)}

CONCLUÍDOS ESTA SEMANA ({len(completed_this_week)}):
{json.dumps(completed_this_week, ensure_ascii=False, indent=2)}
"""

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=1024,
        system="""Você é um coach GTD. Analise os dados da revisão semanal de um gestor e forneça:
1. Um diagnóstico rápido do estado do sistema
2. As 3 ações mais urgentes para esta semana
3. Alertas de risco (itens que podem comprometer projetos)
4. Uma sugestão de item do "Algum dia/talvez" para promover agora
Seja direto, objetivo e prático. Responda em português.""",
        messages=[
            {
                "role": "user",
                "content": f"Gere insights para minha revisão semanal GTD:\n{context}",
            }
        ],
    ) as stream:
        final_message = stream.get_final_message()

    for block in final_message.content:
        if block.type == "text":
            return block.text

    return "Não foi possível gerar insights no momento."


def suggest_next_action_for_project(project_title: str, project_description: str, existing_tasks: list[dict]) -> str:
    """
    Suggests the next physical action for a stalled project.
    """
    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=512,
        system="Você é um especialista GTD. Sugira a próxima ação física e concreta para o projeto. Use um verbo de ação específico. Máximo 1 frase.",
        messages=[
            {
                "role": "user",
                "content": f"Projeto: {project_title}\nDescrição: {project_description}\nTarefas existentes: {json.dumps(existing_tasks, ensure_ascii=False)}\n\nQual é a próxima ação física e concreta?",
            }
        ],
    ) as stream:
        final_message = stream.get_final_message()

    for block in final_message.content:
        if block.type == "text":
            return block.text

    return "Revisar o projeto e definir próximo passo."
