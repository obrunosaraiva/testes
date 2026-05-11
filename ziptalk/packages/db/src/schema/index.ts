import { relations, sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ===== Enums =====
export const planEnum = pgEnum("plan", [
  "free",
  "pro",
  "advanced",
  "business",
  "enterprise",
]);

export const teamRoleEnum = pgEnum("team_role", ["owner", "admin", "member"]);

export const deviceStatusEnum = pgEnum("device_status", [
  "pending_qr",
  "connecting",
  "connected",
  "disconnected",
  "banned",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "trialing",
  "incomplete",
]);

export const usageTypeEnum = pgEnum("usage_type", [
  "transcription",
  "summary",
  "translation",
]);

// ===== Users (espelha auth.users do Supabase) =====
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  locale: text("locale").default("pt-BR").notNull(),
  theme: text("theme").default("system").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

// ===== Teams =====
export const teams = pgTable(
  "teams",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    timezone: text("timezone").default("America/Sao_Paulo").notNull(),
    avatarUrl: text("avatar_url"),
    ownerId: uuid("owner_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    plan: planEnum("plan").default("free").notNull(),
    planMinutes: integer("plan_minutes").default(30).notNull(),
    billingEmail: text("billing_email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [uniqueIndex("teams_slug_idx").on(t.slug)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: teamRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [uniqueIndex("team_members_pk").on(t.teamId, t.userId)],
);

// ===== Devices (instâncias do WhatsApp) =====
export const devices = pgTable(
  "devices",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    evolutionInstanceName: text("evolution_instance_name").notNull().unique(),
    phoneNumber: text("phone_number"),
    displayName: text("display_name"),
    status: deviceStatusEnum("status").default("pending_qr").notNull(),
    qrCodeBase64: text("qr_code_base64"),
    lastConnectedAt: timestamp("last_connected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [index("devices_team_idx").on(t.teamId)],
);

// ===== Contatos (cache) =====
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" })
      .notNull(),
    waJid: text("wa_jid").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [uniqueIndex("contacts_device_jid_idx").on(t.deviceId, t.waJid)],
);

// ===== Transcrições =====
export const transcriptions = pgTable(
  "transcriptions",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" })
      .notNull(),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    messageId: text("message_id").notNull(),
    audioUrl: text("audio_url"),
    audioDurationSeconds: integer("audio_duration_seconds").notNull(),
    language: text("language"),
    text: text("text").notNull(),
    summary: text("summary"),
    translation: text("translation"),
    isFromMe: boolean("is_from_me").default(false).notNull(),
    isPrivate: boolean("is_private").default(false).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    index("transcriptions_device_idx").on(t.deviceId),
    uniqueIndex("transcriptions_msg_idx").on(t.deviceId, t.messageId),
  ],
);

// ===== Correções de palavras =====
export const wordCorrections = pgTable(
  "word_corrections",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    pattern: text("pattern").notNull(),
    replacement: text("replacement").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [index("word_corrections_team_idx").on(t.teamId)],
);

// ===== Assinaturas =====
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  plan: planEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  asaasSubscriptionId: text("asaas_subscription_id"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

// ===== Faturas =====
export const invoices = pgTable("invoices", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  subscriptionId: uuid("subscription_id")
    .references(() => subscriptions.id, { onDelete: "cascade" })
    .notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default("BRL").notNull(),
  status: text("status").notNull(),
  pdfUrl: text("pdf_url"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

// ===== Consumo (uso) =====
export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    deviceId: uuid("device_id").references(() => devices.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    transcriptionId: uuid("transcription_id").references(
      () => transcriptions.id,
      { onDelete: "set null" },
    ),
    type: usageTypeEnum("type").notNull(),
    durationSeconds: integer("duration_seconds").default(0).notNull(),
    tokensUsed: integer("tokens_used").default(0).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    index("usage_team_created_idx").on(t.teamId, t.createdAt),
    index("usage_device_idx").on(t.deviceId),
  ],
);

// ===== Regras de encaminhamento (v1.1) =====
export const forwardingRules = pgTable("forwarding_rules", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  sourceContactJid: text("source_contact_jid").notNull(),
  targetContactJid: text("target_contact_jid").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

// ===== Relations =====
export const usersRelations = relations(users, ({ many }) => ({
  ownedTeams: many(teams),
  memberships: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.ownerId], references: [users.id] }),
  members: many(teamMembers),
  devices: many(devices),
  subscription: one(subscriptions),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  team: one(teams, { fields: [devices.teamId], references: [teams.id] }),
  contacts: many(contacts),
  transcriptions: many(transcriptions),
}));
