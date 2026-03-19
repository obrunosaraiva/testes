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


# ─── Batch clarification ──────────────────────────────────────────────────────

def batch_clarify_inbox_items(
    items: list[dict],
    existing_projects: list[str],
    user_context: dict | None = None,
) -> list[dict]:
    """
    Clarifies multiple inbox items in a single Claude call.
    items: [{"id": int, "content": str}, ...]
    Returns: [{"id": int, "clarification": dict}, ...]
    """
    context_block = ""
    if existing_projects:
        context_block += f"\nProjetos ativos: {', '.join(existing_projects)}"
    if user_context:
        if user_context.get("top_people"):
            context_block += f"\nPessoas recorrentes: {', '.join(user_context['top_people'])}"
        if user_context.get("top_contexts"):
            context_block += f"\nContextos mais usados: {', '.join(user_context['top_contexts'])}"

    items_block = "\n\n".join(
        f"ITEM {i + 1} (id={item['id']}):\n{item['content']}"
        for i, item in enumerate(items)
    )

    user_message = f"""Analise os itens abaixo da caixa de entrada usando o método GTD.{context_block}

{items_block}

Retorne SOMENTE um array JSON — um objeto por item, na mesma ordem — com esta estrutura exata para cada:
[
  {{
    "id": <id do item>,
    "is_actionable": boolean,
    "takes_less_than_2min": boolean,
    "can_delegate": boolean,
    "list_type": "next_action"|"waiting"|"someday"|"reference"|"trash"|"calendar",
    "next_action": "verbo + ação concreta",
    "context": "@reunião"|"@email"|"@decisão"|"@leitura"|"@telefone"|"@computador"|null,
    "priority": "urgent"|"high"|"medium"|"low",
    "project_suggestion": "nome do projeto ou null",
    "delegate_to": "pessoa ou null",
    "waiting_deadline": "ISO date ou null",
    "due_date": "ISO date ou null",
    "clarification": "explicação em português, máx 2 frases",
    "do_now": boolean,
    "additional_actions": []
  }}
]
Sem texto antes ou depois do array."""

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=4096,
        thinking={"type": "adaptive"},
        system=GTD_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        final_message = stream.get_final_message()

    text_content = ""
    for block in final_message.content:
        if block.type == "text":
            text_content = block.text
            break

    text_content = text_content.strip()
    if text_content.startswith("```"):
        text_content = text_content.split("```")[1]
        if text_content.startswith("json"):
            text_content = text_content[4:]

    try:
        results = json.loads(text_content)
        return [{"id": r["id"], "clarification": r} for r in results]
    except (json.JSONDecodeError, KeyError):
        # Fallback: return empty clarification per item
        return [
            {
                "id": item["id"],
                "clarification": {
                    "is_actionable": True,
                    "takes_less_than_2min": False,
                    "can_delegate": False,
                    "list_type": "next_action",
                    "next_action": item["content"],
                    "context": "@computador",
                    "priority": "medium",
                    "project_suggestion": None,
                    "delegate_to": None,
                    "waiting_deadline": None,
                    "due_date": None,
                    "clarification": "Não foi possível clarificar. Revise manualmente.",
                    "do_now": False,
                    "additional_actions": [],
                },
            }
            for item in items
        ]


# ─── User context profile ─────────────────────────────────────────────────────

def build_user_context_profile(tasks: list[dict], projects: list[str]) -> dict:
    """
    Derives the manager's behavioral patterns from task history.
    Returns a dict with top_people, top_contexts, top_projects, style_notes.
    """
    if not tasks:
        return {}

    tasks_json = json.dumps(tasks[:80], ensure_ascii=False)  # cap to avoid huge prompt
    projects_json = ", ".join(projects[:20])

    user_message = f"""Analise o histórico de tarefas deste gestor e extraia o perfil de trabalho dele.

Projetos ativos: {projects_json}

Histórico de tarefas (JSON):
{tasks_json}

Retorne APENAS JSON com este formato:
{{
  "top_people": ["lista das 5 pessoas mais recorrentes em tarefas delegadas/aguardando"],
  "top_contexts": ["contextos GTD mais usados, em ordem de frequência"],
  "top_projects": ["projetos mais ativos"],
  "work_style": "1 frase descrevendo o padrão de trabalho do gestor",
  "common_patterns": ["até 3 padrões recorrentes observados nas tarefas"]
}}"""

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=512,
        system="Você é um analista de produtividade. Extraia padrões de comportamento a partir do histórico GTD. Responda apenas JSON.",
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        final_message = stream.get_final_message()

    text = ""
    for block in final_message.content:
        if block.type == "text":
            text = block.text
            break

    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}


# ─── WhatsApp follow-up drafter ───────────────────────────────────────────────

def draft_followup_message(
    task_title: str,
    assigned_to: str,
    days_waiting: int,
    due_date: str | None,
    context: str | None,
) -> str:
    """
    Drafts a WhatsApp follow-up message for a waiting item.
    Returns: plain text message ready to send.
    """
    due_info = f"O prazo era {due_date}." if due_date else ""
    days_info = f"Estou aguardando há {days_waiting} dias." if days_waiting else ""

    user_message = f"""Preciso de uma mensagem de cobrança para o WhatsApp.

Tarefa: {task_title}
Aguardando retorno de: {assigned_to}
{days_info} {due_info}

Escreva uma mensagem direta, profissional e cordial para o WhatsApp, de 2 a 4 linhas.
- Não use formalidades excessivas
- Comece pelo nome da pessoa
- Mencione o assunto brevemente
- Peça atualização ou confirmação
- Mantenha o tom de colega de trabalho, não de chefe cobrando
Retorne APENAS o texto da mensagem, pronto para copiar e colar."""

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=256,
        system="Você escreve mensagens de WhatsApp profissionais e cordiais para acompanhamento de tarefas. Seja direto e humano.",
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        final_message = stream.get_final_message()

    for block in final_message.content:
        if block.type == "text":
            return block.text.strip()

    return f"{assigned_to}, tudo bem? Passando para perguntar sobre: {task_title}. Consegue me dar uma atualização?"


# ─── Project decomposition ────────────────────────────────────────────────────

def decompose_project(
    project_title: str,
    project_description: str,
    deadline: str | None,
    existing_projects: list[str],
    user_context: dict | None = None,
) -> list[dict]:
    """
    Breaks a project into concrete GTD tasks.
    Returns list of task dicts ready for DB insertion.
    """
    context_block = ""
    if user_context:
        if user_context.get("top_contexts"):
            context_block = f"\nContextos preferidos do gestor: {', '.join(user_context['top_contexts'])}"
        if user_context.get("top_people"):
            context_block += f"\nEquipe disponível: {', '.join(user_context['top_people'])}"

    deadline_info = f"\nDeadline do projeto: {deadline}" if deadline else ""

    user_message = f"""Decomponha este projeto em tarefas concretas usando o método GTD.

Projeto: {project_title}
Descrição: {project_description}{deadline_info}{context_block}

Crie de 5 a 8 tarefas que cubram o projeto do início ao fim. A PRIMEIRA deve ser list_type="next_action".
As demais podem ser next_action (em sequência) ou waiting (se dependem de terceiros).

Retorne APENAS um array JSON:
[
  {{
    "title": "verbo + ação concreta e específica",
    "list_type": "next_action"|"waiting",
    "context": "@reunião"|"@email"|"@decisão"|"@leitura"|"@telefone"|"@computador"|null,
    "priority": "urgent"|"high"|"medium"|"low",
    "assigned_to": "pessoa responsável ou null",
    "notes": "observação curta sobre esta etapa ou null"
  }}
]
Sem texto antes ou depois."""

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=GTD_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        final_message = stream.get_final_message()

    text = ""
    for block in final_message.content:
        if block.type == "text":
            text = block.text
            break

    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return [
            {
                "title": f"Definir próxima ação para: {project_title}",
                "list_type": "next_action",
                "context": "@reunião",
                "priority": "high",
                "assigned_to": None,
                "notes": None,
            }
        ]


# ─── Positioning strategy analysis ───────────────────────────────────────────

def analyze_positioning_strategy(
    target_audience: str,
    competitors: str | None,
    value_proposition: str,
) -> dict:
    """
    Generates an Al Ries-style positioning strategy analysis.
    Returns a structured dict with category, word_to_own, positioning_statement, etc.
    """
    competitors_block = competitors if competitors and competitors.strip() else "Não informado"

    user_message = f"""Analise esta estratégia de posicionamento usando os princípios de Al Ries e Jack Trout.

Público-alvo: {target_audience}
Concorrentes: {competitors_block}
Proposta de valor: {value_proposition}

Retorne APENAS JSON com esta estrutura:
{{
  "category": "nome da categoria onde esta marca compete",
  "open_position": "posição disponível no mercado que pode ser ownable",
  "word_to_own": "a palavra ou conceito central para ownar na mente do público",
  "positioning_statement": "declaração de posicionamento em 1-2 frases diretas",
  "verbal_nail": "frase de 5-8 palavras impactante e memorável",
  "competitive_advantage": "principal vantagem versus os concorrentes citados",
  "risk_alert": "principal risco ou ameaça ao posicionamento",
  "recommended_actions": ["ação 1", "ação 2", "ação 3"],
  "brand_archetype": "arquétipo de marca mais adequado (ex: Herói, Sábio, Criador...)",
  "summary": "resumo executivo do posicionamento em 3-4 frases"
}}"""

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=1024,
        system="""Você é Al Ries, o lendário estrategista de posicionamento de marca. 
Aplique rigorosamente as leis do posicionamento: lei da liderança, lei da categoria, lei da mente, lei da percepção.
Seja direto, incisivo e prático. Responda sempre em português, apenas JSON.""",
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        final_message = stream.get_final_message()

    text = ""
    for block in final_message.content:
        if block.type == "text":
            text = block.text
            break

    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "category": "Tecnologia para negócios",
            "open_position": "Sistemas inteligentes para empresários",
            "word_to_own": "Inteligência Operacional",
            "positioning_statement": "Sistemas inteligentes que resolvem os problemas reais do seu negócio.",
            "verbal_nail": "Sistemas inteligentes. Problemas resolvidos.",
            "competitive_advantage": "Foco no resultado do empresário, não na tecnologia.",
            "risk_alert": "O termo 'AI' está se tornando commodity.",
            "recommended_actions": [
                "Ownar o termo 'Inteligência Operacional' no mercado",
                "Criar conteúdo educativo para empresários",
                "Documentar casos de sucesso com resultados mensuráveis",
            ],
            "brand_archetype": "Sábio",
            "summary": "Não foi possível gerar análise automática. Use os dados acima como base.",
        }
