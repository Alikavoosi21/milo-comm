import { integer, numeric, pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const knowledgeSources = pgTable("knowledge_sources", {
  id: uuid("id").primaryKey(),
  originalName: text("original_name").notNull(),
  storageKey: text("storage_key"),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  sha256: text("sha256").notNull(),
  status: text("status").notNull(),
  activeVersion: integer("active_version").notNull().default(0),
  errorCategory: text("error_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const usageEvents = pgTable("usage_events", {
  id: uuid("id").primaryKey(),
  requestId: uuid("request_id").notNull(),
  operation: text("operation").notNull(),
  modelName: text("model_name").notNull(),
  providerName: text("provider_name").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  estimated: boolean("estimated").notNull(),
  costAmount: numeric("cost_amount"),
  currency: text("currency"),
  durationMs: integer("duration_ms").notNull(),
  status: text("status").notNull(),
  errorCategory: text("error_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
