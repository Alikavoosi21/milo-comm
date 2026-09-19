ALTER TABLE "conversations" ADD COLUMN "instructions" text DEFAULT '' NOT NULL;
ALTER TABLE "conversations" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "conversations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "conversations" ADD COLUMN "lifecycle_state" text DEFAULT 'active' NOT NULL;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lifecycle_state_check" CHECK ("lifecycle_state" IN ('active', 'deleting'));
CREATE INDEX "conversations_owner_id_id_idx" ON "conversations" USING btree ("owner_id", "id");
CREATE INDEX "context_snapshots_source_idx" ON "context_snapshots" USING btree ("source_type", "source_id");
CREATE INDEX "message_attachments_attachment_id_idx" ON "message_attachments" USING btree ("attachment_id");
