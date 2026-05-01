"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EmailCaptureScreen } from "./EmailCaptureScreen";
import { QuestionScreen, type AnswerValue } from "./QuestionScreen";
import { RewardScreen } from "./RewardScreen";
import { CalculatingScreen } from "./CalculatingScreen";
import { QUESTIONS } from "@/lib/quiz/questions";
import {
  startQuiz,
  saveAnswer,
  completeBlock,
} from "@/lib/actions/quiz";

const STORAGE_KEY = "quiz-pompower:state-v1";

type Step =
  | "email"
  | "question"
  | "reward-1"
  | "reward-2"
  | "calculating"
  | "done";

interface PersistedState {
  respondentId: string;
  questionIndex: number;
  answers: Record<string, AnswerValue>;
  step: Step;
}

interface QuizContainerProps {
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}

export function QuizContainer({ utm }: QuizContainerProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = React.useState(false);
  const [step, setStep] = React.useState<Step>("email");
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [respondentId, setRespondentId] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, AnswerValue>>({});
  const [emailError, setEmailError] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Hydration: lê o estado salvo localmente.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw) as PersistedState;
        if (state.respondentId) {
          setRespondentId(state.respondentId);
          setAnswers(state.answers ?? {});
          setQuestionIndex(state.questionIndex ?? 0);
          setStep(state.step === "done" ? "email" : state.step ?? "question");
        }
      }
    } catch {
      // ignora estado corrompido
    }
    setHydrated(true);
  }, []);

  // Persiste estado no localStorage quando muda.
  React.useEffect(() => {
    if (!hydrated || !respondentId) return;
    const state: PersistedState = {
      respondentId,
      questionIndex,
      answers,
      step,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage indisponível (modo privado, etc) — segue.
    }
  }, [hydrated, respondentId, questionIndex, answers, step]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  // ============== Tela: e-mail ==============
  if (step === "email") {
    return (
      <EmailCaptureScreen
        loading={loading}
        errorMessage={emailError}
        onSubmit={async ({ firstName, email, consentLgpd }) => {
          setEmailError(undefined);
          setLoading(true);
          const userAgent =
            typeof navigator !== "undefined" ? navigator.userAgent : undefined;
          const deviceType: "mobile" | "desktop" | "tablet" =
            typeof window !== "undefined" && window.innerWidth < 768
              ? "mobile"
              : "desktop";

          const result = await startQuiz({
            firstName,
            email,
            consentLgpd,
            utmSource: utm.source,
            utmMedium: utm.medium,
            utmCampaign: utm.campaign,
            userAgent,
            deviceType,
          });
          setLoading(false);

          if (!result.ok) {
            setEmailError(result.error);
            return;
          }
          setRespondentId(result.data.respondentId);
          const resumeIdx = QUESTIONS.findIndex(
            (q) => q.code === result.data.resumeFromQuestion,
          );
          setQuestionIndex(Math.max(0, resumeIdx));
          setStep("question");
        }}
      />
    );
  }

  if (!respondentId) {
    setStep("email");
    return null;
  }

  // ============== Tela: pergunta ==============
  if (step === "question") {
    const question = QUESTIONS[questionIndex];
    const value = answers[question.code] ?? null;

    return (
      <QuestionScreen
        question={question}
        value={value}
        currentIndex={questionIndex}
        totalQuestions={QUESTIONS.length}
        saving={saving}
        onChange={(next) => {
          setAnswers((prev) => ({ ...prev, [question.code]: next }));
        }}
        onBack={
          questionIndex > 0
            ? () => setQuestionIndex((i) => Math.max(0, i - 1))
            : undefined
        }
        onNext={async () => {
          setSaving(true);
          await persistAnswer(respondentId, question.code, question.block, value);

          const nextIdx = questionIndex + 1;
          const reachedRewardAfterBlock1 =
            question.block === 1 &&
            (nextIdx >= QUESTIONS.length ||
              QUESTIONS[nextIdx].block !== 1);
          const finishedQuiz =
            question.block === 2 && nextIdx >= QUESTIONS.length;

          if (reachedRewardAfterBlock1) {
            await completeBlock({ respondentId, block: 1 });
            setSaving(false);
            setStep("reward-1");
            return;
          }

          if (finishedQuiz) {
            setSaving(false);
            setStep("calculating");
            const result = await completeBlock({ respondentId, block: 2 });
            if (result.ok) {
              localStorage.removeItem(STORAGE_KEY);
              router.push(`/resultado/${respondentId}`);
            } else {
              // se falhar, volta pra última pergunta
              setStep("question");
            }
            return;
          }

          setSaving(false);
          setQuestionIndex(nextIdx);
        }}
      />
    );
  }

  // ============== Tela: recompensa 1 ==============
  if (step === "reward-1") {
    return (
      <RewardScreen
        blockNumber={1}
        onContinue={() => {
          // Avança pra primeira pergunta do bloco 2.
          const idx = QUESTIONS.findIndex((q) => q.block === 2);
          setQuestionIndex(idx === -1 ? questionIndex : idx);
          setStep("question");
        }}
      />
    );
  }

  // ============== Tela: calculando perfil ==============
  if (step === "calculating") {
    return <CalculatingScreen />;
  }

  return null;
}

async function persistAnswer(
  respondentId: string,
  questionCode: string,
  block: 0 | 1 | 2,
  value: AnswerValue,
) {
  if (!value) return;
  const payload = {
    respondentId,
    questionCode,
    block,
    answerText: null as string | null,
    answerChoice: null as string | null,
    answerChoices: null as string[] | null,
    answerNumber: null as number | null,
  };

  switch (value.kind) {
    case "single":
      payload.answerChoice = value.value;
      break;
    case "multi":
      payload.answerChoices = value.values;
      break;
    case "text":
      payload.answerText = value.value.trim();
      break;
    case "slider":
      payload.answerNumber = value.value;
      break;
  }

  // Resposta opcional vazia? Não persiste — evita poluir o banco.
  if (
    !payload.answerChoice &&
    !payload.answerChoices &&
    !payload.answerText &&
    payload.answerNumber == null
  ) {
    return;
  }

  await saveAnswer(payload);
}
