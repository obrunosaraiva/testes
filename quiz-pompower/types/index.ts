export type Archetype =
  | "renascimento"
  | "expansao"
  | "equilibrio"
  | "dominio";

export type AgeRange =
  | "20-29"
  | "30-39"
  | "40-49"
  | "50+"
  | "nao_informado";

export type HasChildren =
  | "nao"
  | "parto_normal"
  | "cesarea"
  | "ambos"
  | "nao_informado";

export type RespondentStatus =
  | "started"
  | "block_1_completed"
  | "block_2_completed"
  | "result_delivered";

export type DeviceType = "mobile" | "desktop" | "tablet";

export interface Respondent {
  id: string;
  email: string;
  firstName: string;
  ageRange: AgeRange | null;
  hasChildren: HasChildren | null;
  status: RespondentStatus;
  profileArchetype: Archetype | null;
  consentLgpdAt: string;
  eligibleForDraw: boolean;
  drawWinner: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  userAgent: string | null;
  deviceType: DeviceType | null;
  startedAt: string;
  block1CompletedAt: string | null;
  block2CompletedAt: string | null;
  resultDeliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QuestionBlock = 0 | 1 | 2;

export interface Answer {
  id: string;
  respondentId: string;
  questionCode: string;
  block: QuestionBlock;
  answerText: string | null;
  answerChoice: string | null;
  answerChoices: string[] | null;
  answerNumber: number | null;
  answeredAt: string;
}

export type AnswerInput =
  | { type: "single_select"; value: string }
  | { type: "multi_select"; values: string[] }
  | { type: "open_text"; value: string }
  | { type: "slider"; value: number };

export interface AnswersForScoring {
  p1?: string[];
  p2?: number;
  p7?: string;
  p9?: string;
  p10?: string;
  p11?: string;
}

export interface ProfileContent {
  archetype: Archetype;
  emoji: string;
  name: string;
  tagline: string;
  description: string[];
  characteristics: string[];
  recommendations: string[];
  expertMessage: string;
  gradientFrom: string;
  gradientTo: string;
}
