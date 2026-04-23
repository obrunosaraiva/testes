// Roteiro fixo de entrevista guiada. A ordem importa: cada passo refina
// o contexto antes da geracao final do PRD.

export const INTERVIEW_STEPS = [
  {
    id: "idea",
    title: "A ideia em uma frase",
    prompt:
      "Em uma frase, qual é a ideia? Ex.: 'um app que transforma notas de voz em resumos com tarefas'.",
    placeholder: "Descreva sua ideia em uma frase...",
    minLength: 15
  },
  {
    id: "problem",
    title: "Problema e público-alvo",
    prompt:
      "Qual problema isso resolve e para quem? Quem é o usuário ideal e o que ele faz hoje sem sua solução?",
    placeholder: "Ex.: freelancers que perdem 2h/dia organizando reuniões...",
    minLength: 20
  },
  {
    id: "features",
    title: "Funcionalidades principais",
    prompt:
      "Liste 3 a 6 funcionalidades essenciais do MVP. Pode listar em bullets. O que NÃO pode faltar no primeiro release?",
    placeholder: "- Login\n- Upload de áudio\n- Transcrição automática\n- ...",
    minLength: 20
  },
  {
    id: "platform",
    title: "Plataforma e stack",
    prompt:
      "Será Web, Mobile, Desktop ou CLI? Alguma preferência de linguagem/framework (React, Next.js, Python, Node, etc.)? Se não souber, responda 'sem preferência'.",
    placeholder: "Ex.: Web com Next.js + Supabase, ou 'sem preferência'",
    minLength: 3
  },
  {
    id: "integrations",
    title: "Integrações externas",
    prompt:
      "Precisa de autenticação (Google, email), pagamentos (Stripe), IA (Claude/OpenAI), armazenamento, email transacional, ou outras APIs? Liste o que vier à mente.",
    placeholder: "Ex.: Auth Google, Stripe, Claude API, S3...",
    minLength: 3
  },
  {
    id: "data",
    title: "Dados e modelo",
    prompt:
      "Que entidades/dados o sistema manipula? Ex.: usuários, projetos, transcrições, pagamentos. Quais relacionamentos existem?",
    placeholder: "Ex.: Usuário tem muitos Projetos; Projeto tem muitas Notas...",
    minLength: 10
  },
  {
    id: "security",
    title: "Segurança e compliance",
    prompt:
      "Há requisitos de segurança, privacidade ou compliance (LGPD/GDPR, dados sensíveis, PCI, isolamento multi-tenant)? Se não, diga 'padrão'.",
    placeholder: "Ex.: LGPD, dados de saúde (sensíveis), multi-tenant...",
    minLength: 3
  },
  {
    id: "scope",
    title: "Escopo do MVP",
    prompt:
      "O que é absolutamente essencial para o MVP vs. o que é 'nice-to-have' para v2? Seja ruthless: melhor cortar.",
    placeholder: "Essencial: ...\nFuturo (v2): ...",
    minLength: 15
  }
];

export function buildInterviewContext(answers) {
  return INTERVIEW_STEPS.map((s) => {
    const a = answers[s.id] ?? "(sem resposta)";
    return `### ${s.title}\n${a}`;
  }).join("\n\n");
}
