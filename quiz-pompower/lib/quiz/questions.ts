import type { QuestionBlock } from "@/types";

export type QuestionType =
  | "single_select"
  | "multi_select"
  | "open_text"
  | "slider";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  code: string;
  block: QuestionBlock;
  type: QuestionType;
  question: string;
  helpText?: string;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  maxSelections?: number;
  optional?: boolean;
  characterLimit?: number;
}

const PREFER_NOT_ANSWER: QuestionOption = {
  value: "prefiro_nao_responder",
  label: "Prefiro não responder",
};

export const QUESTIONS: Question[] = [
  // ===== Pré-quiz =====
  {
    code: "p0",
    block: 0,
    type: "single_select",
    question: "Sua idade",
    options: [
      { value: "20-29", label: "20 a 29 anos" },
      { value: "30-39", label: "30 a 39 anos" },
      { value: "40-49", label: "40 a 49 anos" },
      { value: "50+", label: "50 anos ou mais" },
      PREFER_NOT_ANSWER,
    ],
    optional: true,
  },
  {
    code: "p0b",
    block: 0,
    type: "single_select",
    question: "Você tem filhos?",
    options: [
      { value: "nao", label: "Não" },
      { value: "parto_normal", label: "Sim, parto normal" },
      { value: "cesarea", label: "Sim, cesárea" },
      { value: "ambos", label: "Sim, ambos" },
      PREFER_NOT_ANSWER,
    ],
    optional: true,
  },

  // ===== Bloco 1 — Diagnóstico =====
  {
    code: "p1",
    block: 1,
    type: "multi_select",
    question: "O que MAIS te incomoda hoje na sua vida íntima?",
    helpText: "Escolha até 2 opções.",
    maxSelections: 2,
    options: [
      { value: "falta_desejo", label: "Falta de desejo / libido baixa" },
      {
        value: "dificuldade_orgasmo",
        label: "Dificuldade de chegar ao orgasmo",
      },
      {
        value: "falta_firmeza",
        label: 'Falta de firmeza / sensação de "frouxidão"',
      },
      { value: "ressecamento", label: "Ressecamento / dor na relação" },
      {
        value: "perda_urina",
        label: "Perda de urina (esforço, tosse, exercício)",
      },
      {
        value: "vergonha_desconexao",
        label: "Vergonha / desconexão com o próprio corpo",
      },
      {
        value: "distancia_emocional",
        label: "Distância emocional do parceiro",
      },
      {
        value: "falta_tempo_energia",
        label: "Falta de tempo/energia pra mim mesma",
      },
      { value: "outro", label: "Outro" },
      PREFER_NOT_ANSWER,
    ],
  },
  {
    code: "p2",
    block: 1,
    type: "slider",
    question: "De 0 a 10, como você avalia hoje sua satisfação sexual?",
    min: 0,
    max: 10,
    minLabel: "Muito insatisfeita",
    maxLabel: "Muito satisfeita",
  },
  {
    code: "p3",
    block: 1,
    type: "single_select",
    question: "Você ainda pratica os exercícios do PompoarPower?",
    options: [
      { value: "sim_regular", label: "Sim, regularmente (3+ vezes por semana)" },
      { value: "as_vezes", label: "Às vezes (1-2 vezes por semana)" },
      { value: "raramente", label: "Raramente" },
      { value: "parei", label: "Parei" },
      { value: "quase_nunca", label: "Quase nunca pratiquei" },
    ],
  },
  {
    code: "p4",
    block: 1,
    type: "single_select",
    question:
      "Se parou ou pratica pouco, qual o principal motivo?",
    options: [
      { value: "falta_tempo", label: "Falta de tempo" },
      { value: "esqueco", label: "Esqueço de fazer" },
      { value: "sem_resultado", label: "Não vejo resultado mais" },
      { value: "duvida_execucao", label: "Não sei se estou fazendo certo" },
      { value: "sozinha_nao_mantenho", label: "Sozinha não consigo manter" },
      { value: "ja_alcancei", label: "Já alcancei o que queria" },
      { value: "outro", label: "Outro" },
      { value: "nao_se_aplica", label: "Não se aplica" },
    ],
    optional: true,
  },
  {
    code: "p5",
    block: 1,
    type: "open_text",
    question:
      "Tem algum sintoma ou questão que o PompoarPower NÃO resolveu pra você?",
    helpText: "Conta pra mim. Pode escrever o que vier (até 500 caracteres).",
    characterLimit: 500,
    optional: true,
  },

  // ===== Bloco 2 — Desejo + Investimento =====
  {
    code: "p6",
    block: 2,
    type: "open_text",
    question:
      "Se eu te entregasse uma transformação íntima completa em 90 dias, qual seria?",
    helpText: "2 ou 3 frases já bastam.",
    characterLimit: 500,
    optional: true,
  },
  {
    code: "p7",
    block: 2,
    type: "single_select",
    question:
      "Qual área da sua vida íntima você mais quer destravar agora?",
    options: [
      { value: "prazer_orgasmo", label: "Prazer e orgasmo" },
      { value: "saude_hormonal_ciclo", label: "Saúde hormonal e ciclo" },
      { value: "conexao_parceiro", label: "Conexão com parceiro" },
      {
        value: "autoestima_amor_proprio",
        label: "Autoestima e amor-próprio íntimo",
      },
      {
        value: "performance_dominio",
        label: "Performance e domínio do corpo",
      },
      {
        value: "reverter_sintomas",
        label:
          "Reverter sintomas físicos (incontinência, ressecamento, dor)",
      },
    ],
  },
  {
    code: "p8",
    block: 2,
    type: "open_text",
    question: "Em 1 ano, como você quer se sentir?",
    characterLimit: 500,
    optional: true,
  },
  {
    code: "p9",
    block: 2,
    type: "single_select",
    question:
      "Já investiu em algo além do PompoarPower pra essa área?",
    options: [
      { value: "terapia", label: "Sim, terapia/psicólogo" },
      { value: "ginecologista", label: "Sim, ginecologista/médico" },
      { value: "outros_cursos", label: "Sim, outros cursos/programas" },
      { value: "suplementos", label: "Sim, suplementos/produtos" },
      { value: "so_pompoarpower", label: "Não, só o PompoarPower mesmo" },
      PREFER_NOT_ANSWER,
    ],
  },
  {
    code: "p10",
    block: 2,
    type: "single_select",
    question:
      "Se existisse uma solução PREMIUM da [Nome da Expert] pra resolver sua dor principal, qual formato te atrairia MAIS?",
    options: [
      {
        value: "programa_grupo",
        label: "Programa em grupo com encontros ao vivo (3-6 meses)",
      },
      {
        value: "mentoria_individual",
        label: "Mentoria individual com a expert (1:1)",
      },
      { value: "curso_comunidade", label: "Curso novo + comunidade ativa" },
      { value: "imersao_presencial", label: "Imersão presencial / retiro" },
      {
        value: "assinatura_mensal",
        label: "Acompanhamento contínuo (assinatura mensal)",
      },
      { value: "nenhum", label: "Nenhum desses" },
    ],
  },
  {
    code: "p11",
    block: 2,
    type: "single_select",
    question:
      "Imaginando que você fosse investir em VOCÊ MESMA agora, quanto investiria pra resolver sua dor íntima principal?",
    options: [
      { value: "ate_297", label: "Até R$ 297" },
      { value: "298_597", label: "R$ 298 a R$ 597" },
      { value: "598_997", label: "R$ 598 a R$ 997" },
      { value: "998_1997", label: "R$ 998 a R$ 1.997" },
      { value: "1998_2997", label: "R$ 1.998 a R$ 2.997" },
      { value: "acima_2997", label: "Acima de R$ 2.997" },
      PREFER_NOT_ANSWER,
    ],
  },
  {
    code: "p12",
    block: 2,
    type: "single_select",
    question: "Em quanto tempo quer ver resultado?",
    options: [
      { value: "ja_ontem", label: "Já, ontem" },
      { value: "30_dias", label: "30 dias" },
      { value: "90_dias", label: "90 dias" },
      { value: "6_meses", label: "6 meses" },
      { value: "sem_pressa", label: "Sem pressa" },
    ],
  },
  {
    code: "p13",
    block: 2,
    type: "single_select",
    question:
      "Se eu lançar algo novo na próxima semana, você quer ser avisada primeiro?",
    options: [
      { value: "sim_fundadora", label: "Sim, quero acesso fundador" },
      {
        value: "sim_se_pra_mim",
        label: "Sim, mas só se for pra mim",
      },
      {
        value: "so_se_relevante",
        label: "Não, só me avise se for muito relevante",
      },
      { value: "nao", label: "Não" },
    ],
  },
];

export function getQuestionByCode(code: string): Question | undefined {
  return QUESTIONS.find((q) => q.code === code);
}

export function getQuestionsByBlock(block: QuestionBlock): Question[] {
  return QUESTIONS.filter((q) => q.block === block);
}

export function getNextQuestion(currentCode: string): Question | undefined {
  const idx = QUESTIONS.findIndex((q) => q.code === currentCode);
  if (idx === -1 || idx === QUESTIONS.length - 1) return undefined;
  return QUESTIONS[idx + 1];
}

export function getPreviousQuestion(
  currentCode: string,
): Question | undefined {
  const idx = QUESTIONS.findIndex((q) => q.code === currentCode);
  if (idx <= 0) return undefined;
  return QUESTIONS[idx - 1];
}

export const TOTAL_QUESTIONS = QUESTIONS.length;
