import { z } from "zod";

export const startQuizSchema = z.object({
  email: z.string().email().max(200),
  firstName: z.string().min(2).max(50),
  consentLgpd: z.literal(true, {
    errorMap: () => ({ message: "É preciso aceitar os termos para continuar." }),
  }),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  userAgent: z.string().max(500).optional(),
  deviceType: z.enum(["mobile", "desktop", "tablet"]).optional(),
});
export type StartQuizInput = z.infer<typeof startQuizSchema>;

export const saveAnswerSchema = z
  .object({
    respondentId: z.string().uuid(),
    questionCode: z.string().regex(/^p[0-9]+b?$/),
    block: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    answerText: z.string().max(2000).nullable().optional(),
    answerChoice: z.string().max(100).nullable().optional(),
    answerChoices: z.array(z.string().max(100)).max(10).nullable().optional(),
    answerNumber: z.number().int().min(0).max(10).nullable().optional(),
  })
  .refine(
    (data) =>
      data.answerText != null ||
      data.answerChoice != null ||
      (data.answerChoices != null && data.answerChoices.length > 0) ||
      data.answerNumber != null,
    { message: "Pelo menos um campo de resposta deve ser informado." },
  );
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;

export const completeBlockSchema = z.object({
  respondentId: z.string().uuid(),
  block: z.union([z.literal(1), z.literal(2)]),
});
export type CompleteBlockInput = z.infer<typeof completeBlockSchema>;

export const resumeQuizSchema = z.object({
  email: z.string().email().max(200),
});
export type ResumeQuizInput = z.infer<typeof resumeQuizSchema>;
