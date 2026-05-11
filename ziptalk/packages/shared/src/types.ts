import { z } from "zod";

export const sttJobSchema = z.object({
  teamId: z.string().uuid(),
  deviceId: z.string().uuid(),
  evolutionInstance: z.string(),
  messageId: z.string(),
  audioUrl: z.string().url(),
  audioMimeType: z.string(),
  fromJid: z.string(),
  fromName: z.string().optional(),
  durationSeconds: z.number().positive(),
  isFromMe: z.boolean(),
});
export type SttJob = z.infer<typeof sttJobSchema>;

export const summarizeJobSchema = z.object({
  transcriptionId: z.string().uuid(),
  text: z.string(),
  language: z.string(),
});
export type SummarizeJob = z.infer<typeof summarizeJobSchema>;

export const waSendJobSchema = z.object({
  teamId: z.string().uuid(),
  evolutionInstance: z.string(),
  toJid: z.string(),
  quotedMessageId: z.string().optional(),
  text: z.string(),
});
export type WaSendJob = z.infer<typeof waSendJobSchema>;

export const evolutionWebhookSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.unknown(),
});
export type EvolutionWebhook = z.infer<typeof evolutionWebhookSchema>;
