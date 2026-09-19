import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const messageRole = pgEnum("message_role", ["user", "assistant"]);
export const messageStatus = pgEnum("message_status", ["pending", "streaming", "completed", "failed", "cancelled"]);
export const generationPhase = pgEnum("generation_phase", ["accepted", "file_reading", "context_ready", "generating", "completed", "failed", "cancelled"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  anonymous: boolean("anonymous").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uiPreferences = pgTable("ui_preferences", {
  ownerId: uuid("owner_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("light"),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  instructions: text("instructions").notNull().default(""),
  revision: integer("revision").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lifecycleState: text("lifecycle_state").notNull().default("active"),
  activeBranchId: uuid("active_branch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("conversations_owner_id_id_idx").on(table.ownerId, table.id),
]);

export const conversationBranches = pgTable("conversation_branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  rootMessageId: uuid("root_message_id"),
  headMessageId: uuid("head_message_id"),
  label: text("label").notNull().default("مسیر اصلی"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id").notNull().references(() => conversationBranches.id, { onDelete: "cascade" }),
  parentMessageId: uuid("parent_message_id"),
  role: messageRole("role").notNull(),
  content: text("content").notNull(),
  status: messageStatus("status").notNull().default("pending"),
  idempotencyKey: text("idempotency_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantMessageId: uuid("assistant_message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  phase: generationPhase("phase").notNull(),
  errorCategory: text("error_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
