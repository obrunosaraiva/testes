import type { Archetype, AnswersForScoring } from "@/types";

type ArchetypeScores = Record<Archetype, number>;

const TIE_BREAKER_ORDER: Archetype[] = [
  "equilibrio",
  "renascimento",
  "expansao",
  "dominio",
];

const PAIN_TO_ARCHETYPE: Record<string, Archetype> = {
  vergonha_desconexao: "renascimento",
  falta_desejo: "renascimento",
  dificuldade_orgasmo: "expansao",
  distancia_emocional: "expansao",
  ressecamento: "equilibrio",
  perda_urina: "equilibrio",
  falta_firmeza: "equilibrio",
};

const AREA_TO_SCORE: Record<string, Partial<ArchetypeScores>> = {
  autoestima_amor_proprio: { renascimento: 4 },
  prazer_orgasmo: { expansao: 4 },
  conexao_parceiro: { expansao: 3 },
  saude_hormonal_ciclo: { equilibrio: 4 },
  reverter_sintomas: { equilibrio: 4 },
  performance_dominio: { dominio: 4 },
};

const FORMAT_TO_DOMINIO: ReadonlySet<string> = new Set([
  "mentoria_individual",
  "imersao_presencial",
]);

const HIGH_INVESTMENT: ReadonlySet<string> = new Set([
  "1998_2997",
  "acima_2997",
]);

const PREVIOUS_INVESTMENT_DOMINIO: ReadonlySet<string> = new Set([
  "outros_cursos",
  "terapia",
]);

export function calculateProfile(answers: AnswersForScoring): Archetype {
  const scores: ArchetypeScores = {
    renascimento: 0,
    expansao: 0,
    equilibrio: 0,
    dominio: 0,
  };

  // P1 — Dor principal (peso 3 por dor relevante)
  for (const pain of answers.p1 ?? []) {
    const target = PAIN_TO_ARCHETYPE[pain];
    if (target) scores[target] += 3;
  }

  // P2 — Satisfação sexual (peso 2 nos extremos)
  if (typeof answers.p2 === "number") {
    if (answers.p2 <= 4) scores.renascimento += 2;
    else if (answers.p2 >= 7) scores.expansao += 2;
  }

  // P7 — Área a destravar (peso 3-4, dimensão mais importante)
  if (answers.p7) {
    const partial = AREA_TO_SCORE[answers.p7];
    if (partial) {
      for (const arch of Object.keys(partial) as Archetype[]) {
        scores[arch] += partial[arch] ?? 0;
      }
    }
  }

  // P9 — Já investiu antes (peso 1 pra Domínio)
  if (answers.p9 && PREVIOUS_INVESTMENT_DOMINIO.has(answers.p9)) {
    scores.dominio += 1;
  }

  // P10 — Formato preferido (peso 2 pra Domínio em formatos premium)
  if (answers.p10 && FORMAT_TO_DOMINIO.has(answers.p10)) {
    scores.dominio += 2;
  }

  // P11 — Capacidade financeira (peso 2 pra Domínio em tickets altos)
  if (answers.p11 && HIGH_INVESTMENT.has(answers.p11)) {
    scores.dominio += 2;
  }

  const max = Math.max(...Object.values(scores));
  for (const arch of TIE_BREAKER_ORDER) {
    if (scores[arch] === max) return arch;
  }

  return "renascimento";
}

export function getScoresForDebug(
  answers: AnswersForScoring,
): ArchetypeScores {
  // Útil pro admin entender por que uma respondente caiu num perfil.
  const archetype = calculateProfile(answers);
  return {
    renascimento: 0,
    expansao: 0,
    equilibrio: 0,
    dominio: 0,
    [archetype]: 1,
  } as ArchetypeScores;
}
