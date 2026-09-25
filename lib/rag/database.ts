import { Pool } from "pg";
import { env } from "@/lib/validation/env";

let pool: Pool | undefined;
let prepared: Promise<void> | undefined;

export function ragPool() {
  pool ??= new Pool({ connectionString: env.DATABASE_URL, max: 5 });
  return pool;
}

export function prepareRagDatabase() {
  prepared ??= (async () => {
    const db = ragPool();
    await db.query("CREATE EXTENSION IF NOT EXISTS vector");
    await db.query(
      "CREATE TABLE IF NOT EXISTS knowledge_sources (" +
      "id UUID PRIMARY KEY, original_name TEXT NOT NULL, storage_key TEXT, mime_type TEXT NOT NULL, " +
      "byte_size INTEGER NOT NULL, sha256 TEXT NOT NULL, status TEXT NOT NULL, active_version INTEGER NOT NULL DEFAULT 0, " +
      "error_category TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    );
    await db.query("CREATE TABLE IF NOT EXISTS rag_settings (id INTEGER PRIMARY KEY CHECK (id=1), value JSONB NOT NULL)");
    await db.query(
      "CREATE TABLE IF NOT EXISTS usage_events (" +
      "id UUID PRIMARY KEY, request_id UUID NOT NULL, operation TEXT NOT NULL, model_name TEXT NOT NULL, " +
      "provider_name TEXT NOT NULL, input_tokens INTEGER, output_tokens INTEGER, estimated BOOLEAN NOT NULL, " +
      "cost_amount NUMERIC, currency TEXT, duration_ms INTEGER NOT NULL, status TEXT NOT NULL, " +
      "error_category TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    );
  })().catch((error) => {
    prepared = undefined;
    throw error;
  });
  return prepared;
}
