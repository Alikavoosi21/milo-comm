import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { conversations, messages, users } from "./chat";

export const attachmentStatus = pgEnum("attachment_status", ["selected", "validating", "uploading", "extracting", "ready", "rejected", "failed"]);

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  originalName: text("original_name").notNull(),
  declaredType: text("declared_type").notNull(),
  detectedType: text("detected_type"),
  byteSize: integer("byte_size").notNull(),
  sha256: text("sha256"),
  status: attachmentStatus("status").notNull().default("selected"),
  extractedText: text("extracted_text"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageAttachments = pgTable("message_attachments", {
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  attachmentId: uuid("attachment_id").notNull().references(() => attachments.id, { onDelete: "cascade" }),
}, (table) => [
  index("message_attachments_attachment_id_idx").on(table.attachmentId),
]);

export const messageConversationReferences = pgTable("message_conversation_references", {
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  referencedConversationId: uuid("referenced_conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
});

export const contextSnapshots = pgTable("context_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  label: text("label").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("context_snapshots_source_idx").on(table.sourceType, table.sourceId),
]);
