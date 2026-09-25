import { randomUUID } from "node:crypto";
import { env, ragStorageMode } from "@/lib/validation/env";
import { localUsage, pushLocalUsage } from "@/lib/rag/knowledge-store";
import { prepareRagDatabase, ragPool } from "@/lib/rag/database";

export type UsageOperation = "answer" | "summarize" | "rewrite" | "embed" | "rerank" | "search";
export interface UsageEvent {
  id: string; requestId: string; operation: UsageOperation; modelName: string; providerName: string;
  inputTokens: number | null; outputTokens: number | null; estimated: boolean;
  costAmount: number | null; currency: string | null; durationMs: number;
  status: "completed" | "failed"; errorCategory: string | null; createdAt: string;
}
export function estimateTokens(text: string) { return Math.ceil([...text].length / 4); }
function price(event: Pick<UsageEvent, "operation" | "inputTokens" | "outputTokens">) {
  if (event.operation === "search") return env.WEB_SEARCH_COST_PER_QUERY ?? null;
  if (event.operation === "rerank") {
    return env.RERANK_COST_PER_THOUSAND === undefined ? null : (event.inputTokens ?? 0) * env.RERANK_COST_PER_THOUSAND / 1000;
  }
  if (event.operation === "embed") {
    return env.EMBEDDING_COST_PER_MILLION === undefined ? null : (event.inputTokens ?? 0) * env.EMBEDDING_COST_PER_MILLION / 1_000_000;
  }
  if (env.AI_INPUT_COST_PER_MILLION === undefined || env.AI_OUTPUT_COST_PER_MILLION === undefined) return null;
  return ((event.inputTokens ?? 0) * env.AI_INPUT_COST_PER_MILLION + (event.outputTokens ?? 0) * env.AI_OUTPUT_COST_PER_MILLION) / 1_000_000;
}
export async function recordUsage(input: Omit<UsageEvent, "id" | "createdAt" | "costAmount" | "currency"> & { costAmountOverride?: number }) {
  const { costAmountOverride, ...fields } = input;
  const cost = costAmountOverride ?? price(fields);
  const event: UsageEvent = {
    ...fields, id: randomUUID(), createdAt: new Date().toISOString(),
    costAmount: cost, currency: cost === null ? null : env.COST_CURRENCY,
  };
  if (ragStorageMode === "local") { pushLocalUsage(event); return event; }
  await prepareRagDatabase();
  await ragPool().query(
    "INSERT INTO usage_events (id,request_id,operation,model_name,provider_name,input_tokens,output_tokens,estimated,cost_amount,currency,duration_ms,status,error_category,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
    [event.id,event.requestId,event.operation,event.modelName,event.providerName,event.inputTokens,event.outputTokens,event.estimated,event.costAmount,event.currency,event.durationMs,event.status,event.errorCategory,event.createdAt]
  );
  return event;
}
export async function listUsage(filters: { from?: string; to?: string; operation?: UsageOperation } = {}) {
  if (ragStorageMode === "local") {
    return (localUsage() as UsageEvent[]).filter((event) =>
      (!filters.from || event.createdAt >= filters.from) &&
      (!filters.to || event.createdAt <= filters.to) &&
      (!filters.operation || event.operation === filters.operation));
  }
  await prepareRagDatabase();
  const result = await ragPool().query(
    "SELECT * FROM usage_events WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND ($2::timestamptz IS NULL OR created_at <= $2) AND ($3::text IS NULL OR operation=$3) ORDER BY created_at DESC LIMIT 500",
    [filters.from || null, filters.to || null, filters.operation || null]
  );
  return result.rows.map((row): UsageEvent => ({
    id: String(row.id), requestId: String(row.request_id), operation: row.operation as UsageOperation,
    modelName: String(row.model_name), providerName: String(row.provider_name),
    inputTokens: row.input_tokens === null ? null : Number(row.input_tokens),
    outputTokens: row.output_tokens === null ? null : Number(row.output_tokens),
    estimated: Boolean(row.estimated), costAmount: row.cost_amount === null ? null : Number(row.cost_amount),
    currency: row.currency ? String(row.currency) : null, durationMs: Number(row.duration_ms),
    status: row.status as UsageEvent["status"], errorCategory: row.error_category ? String(row.error_category) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}

