"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { calculateProfile } from "@/lib/quiz/scoring";
import { getProfile as getProfileContent } from "@/lib/quiz/profiles";
import { QUESTIONS } from "@/lib/quiz/questions";
import {
  startQuizSchema,
  saveAnswerSchema,
  completeBlockSchema,
  resumeQuizSchema,
  type StartQuizInput,
  type SaveAnswerInput,
  type CompleteBlockInput,
  type ResumeQuizInput,
} from "./schemas";
import type {
  Archetype,
  AnswersForScoring,
  ProfileContent,
  RespondentStatus,
} from "@/types";
import type { Database } from "@/types/database";

type RespondentUpdate = Database["public"]["Tables"]["respondents"]["Update"];

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ============================================================
// startQuiz — cria respondente novo OU retoma respondente existente.
// ============================================================
export async function startQuiz(
  raw: StartQuizInput,
): Promise<
  ActionResult<{
    respondentId: string;
    resumeFromQuestion: string;
    isResume: boolean;
  }>
> {
  const parsed = startQuizSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const input = parsed.data;
  const supabase = createServiceClient();

  const existing = await supabase
    .from("respondents")
    .select("id, status")
    .eq("email", input.email)
    .maybeSingle();

  if (existing.error) {
    console.error("[startQuiz] lookup error", existing.error);
    return { ok: false, error: "Erro ao verificar e-mail. Tenta de novo." };
  }

  if (existing.data) {
    if (existing.data.status === "result_delivered") {
      return {
        ok: false,
        error:
          "Você já completou o diagnóstico. Procure o e-mail com o seu Perfil Íntimo na sua caixa de entrada.",
      };
    }
    const resumeFrom = await getResumePoint(existing.data.id);
    return {
      ok: true,
      data: {
        respondentId: existing.data.id,
        resumeFromQuestion: resumeFrom,
        isResume: true,
      },
    };
  }

  const created = await supabase
    .from("respondents")
    .insert({
      email: input.email,
      first_name: input.firstName,
      consent_lgpd_at: new Date().toISOString(),
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      user_agent: input.userAgent ?? null,
      device_type: input.deviceType ?? null,
    })
    .select("id")
    .single();

  if (created.error || !created.data) {
    console.error("[startQuiz] insert error", created.error);
    return { ok: false, error: "Erro ao iniciar o diagnóstico. Tenta de novo." };
  }

  return {
    ok: true,
    data: {
      respondentId: created.data.id,
      resumeFromQuestion: QUESTIONS[0].code,
      isResume: false,
    },
  };
}

// ============================================================
// saveAnswer — upsert da resposta (idempotente por questionCode).
// ============================================================
export async function saveAnswer(
  raw: SaveAnswerInput,
): Promise<ActionResult<{ saved: true }>> {
  const parsed = saveAnswerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Resposta inválida" };
  }
  const input = parsed.data;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("answers")
    .upsert(
      {
        respondent_id: input.respondentId,
        question_code: input.questionCode,
        block: input.block,
        answer_text: input.answerText ?? null,
        answer_choice: input.answerChoice ?? null,
        answer_choices: input.answerChoices ?? null,
        answer_number: input.answerNumber ?? null,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "respondent_id,question_code" },
    );

  if (error) {
    console.error("[saveAnswer] error", error);
    return { ok: false, error: "Erro ao salvar resposta." };
  }
  return { ok: true, data: { saved: true } };
}

// ============================================================
// completeBlock — marca bloco completo e calcula perfil ao fim.
// ============================================================
export async function completeBlock(
  raw: CompleteBlockInput,
): Promise<
  ActionResult<{
    status: RespondentStatus;
    archetype: Archetype | null;
  }>
> {
  const parsed = completeBlockSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos" };
  }
  const { respondentId, block } = parsed.data;
  const supabase = createServiceClient();

  const now = new Date().toISOString();
  const updates: RespondentUpdate = { updated_at: now };

  if (block === 1) {
    updates.status = "block_1_completed";
    updates.block_1_completed_at = now;
    const { error } = await supabase
      .from("respondents")
      .update(updates)
      .eq("id", respondentId);
    if (error) {
      console.error("[completeBlock 1] error", error);
      return { ok: false, error: "Erro ao concluir bloco." };
    }
    return { ok: true, data: { status: "block_1_completed", archetype: null } };
  }

  // block === 2 → também salva pré-quiz no respondente, calcula perfil.
  const answersResult = await supabase
    .from("answers")
    .select("question_code, answer_choice, answer_choices, answer_number")
    .eq("respondent_id", respondentId);

  if (answersResult.error) {
    console.error("[completeBlock 2] answers fetch", answersResult.error);
    return { ok: false, error: "Erro ao calcular perfil." };
  }

  const answers = answersResult.data ?? [];
  const scoring: AnswersForScoring = {};
  let ageRange: string | null = null;
  let hasChildren: string | null = null;

  for (const a of answers) {
    switch (a.question_code) {
      case "p0":
        ageRange = a.answer_choice;
        break;
      case "p0b":
        hasChildren = a.answer_choice;
        break;
      case "p1":
        scoring.p1 = a.answer_choices ?? [];
        break;
      case "p2":
        scoring.p2 = a.answer_number ?? undefined;
        break;
      case "p7":
        scoring.p7 = a.answer_choice ?? undefined;
        break;
      case "p9":
        scoring.p9 = a.answer_choice ?? undefined;
        break;
      case "p10":
        scoring.p10 = a.answer_choice ?? undefined;
        break;
      case "p11":
        scoring.p11 = a.answer_choice ?? undefined;
        break;
    }
  }

  const archetype = calculateProfile(scoring);

  updates.status = "block_2_completed";
  updates.block_2_completed_at = now;
  updates.profile_archetype = archetype;
  updates.eligible_for_draw = true;
  if (ageRange) updates.age_range = ageRange as RespondentUpdate["age_range"];
  if (hasChildren)
    updates.has_children = hasChildren as RespondentUpdate["has_children"];

  const { error } = await supabase
    .from("respondents")
    .update(updates)
    .eq("id", respondentId);

  if (error) {
    console.error("[completeBlock 2] update", error);
    return { ok: false, error: "Erro ao concluir bloco." };
  }

  // E-mail será disparado quando o resultado for visualizado (Fase 3).
  return { ok: true, data: { status: "block_2_completed", archetype } };
}

// ============================================================
// getProfile — busca perfil para a tela de resultado.
// Marca status como result_delivered na primeira leitura.
// ============================================================
export async function getProfile(
  respondentId: string,
): Promise<
  ActionResult<{
    firstName: string;
    archetype: Archetype;
    profile: ProfileContent;
  }>
> {
  if (!respondentId || typeof respondentId !== "string") {
    return { ok: false, error: "ID inválido" };
  }
  const supabase = createServiceClient();

  const { data: respondent, error } = await supabase
    .from("respondents")
    .select("id, first_name, profile_archetype, status, result_delivered_at")
    .eq("id", respondentId)
    .maybeSingle();

  if (error || !respondent) {
    return { ok: false, error: "Diagnóstico não encontrado" };
  }
  if (!respondent.profile_archetype) {
    return {
      ok: false,
      error: "Diagnóstico ainda não foi finalizado. Termine o quiz primeiro.",
    };
  }

  if (respondent.status !== "result_delivered") {
    await supabase
      .from("respondents")
      .update({
        status: "result_delivered",
        result_delivered_at: new Date().toISOString(),
      })
      .eq("id", respondentId);
  }

  return {
    ok: true,
    data: {
      firstName: respondent.first_name,
      archetype: respondent.profile_archetype,
      profile: getProfileContent(respondent.profile_archetype),
    },
  };
}

// ============================================================
// resumeQuiz — busca por e-mail (caso a aluna troque de dispositivo).
// ============================================================
export async function resumeQuiz(
  raw: ResumeQuizInput,
): Promise<
  ActionResult<{
    respondentId: string;
    resumeFromQuestion: string;
    completed: boolean;
  }>
> {
  const parsed = resumeQuizSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "E-mail inválido" };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("respondents")
    .select("id, status")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (error) return { ok: false, error: "Erro ao buscar diagnóstico" };
  if (!data) return { ok: false, error: "Não encontrei um diagnóstico com esse e-mail" };

  const completed = data.status === "result_delivered";
  const resumeFrom = completed
    ? QUESTIONS[QUESTIONS.length - 1].code
    : await getResumePoint(data.id);

  return {
    ok: true,
    data: { respondentId: data.id, resumeFromQuestion: resumeFrom, completed },
  };
}

// ============================================================
// Helper: calcula a próxima pergunta a responder com base no que já foi salvo.
// ============================================================
async function getResumePoint(respondentId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("answers")
    .select("question_code")
    .eq("respondent_id", respondentId);

  const answeredCodes = new Set((data ?? []).map((a) => a.question_code));

  for (const q of QUESTIONS) {
    if (!answeredCodes.has(q.code)) return q.code;
  }
  return QUESTIONS[QUESTIONS.length - 1].code;
}
