export const PLANS = {
  free: { name: "Free", priceBRL: 0, minutes: 30, features: ["transcription"] },
  pro: {
    name: "Pro",
    priceBRL: 69.99,
    minutes: 960,
    features: [
      "transcription",
      "assistant",
      "summary",
      "translation",
      "private",
      "offensive_filter",
    ],
  },
  advanced: {
    name: "Advanced",
    priceBRL: 119.99,
    minutes: 1920,
    features: [
      "transcription",
      "assistant",
      "summary",
      "translation",
      "private",
      "offensive_filter",
      "unlimited_numbers",
      "auto_forward",
    ],
  },
  business: {
    name: "Business",
    priceBRL: 199.99,
    minutes: 3840,
    features: [
      "transcription",
      "assistant",
      "summary",
      "translation",
      "private",
      "offensive_filter",
      "unlimited_numbers",
      "auto_forward",
      "team",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceBRL: 359.99,
    minutes: 7680,
    features: [
      "transcription",
      "assistant",
      "summary",
      "translation",
      "private",
      "offensive_filter",
      "unlimited_numbers",
      "auto_forward",
      "team",
      "centralized_management",
      "sla",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export const TEAM_ROLES = ["owner", "admin", "member"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const DEVICE_STATUS = [
  "pending_qr",
  "connecting",
  "connected",
  "disconnected",
  "banned",
] as const;
export type DeviceStatus = (typeof DEVICE_STATUS)[number];

export const TRANSCRIPTION_FOOTER = "⚡ _Transcrição com IA por Ziptalk_";
