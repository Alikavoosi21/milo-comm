import { env } from "@/lib/validation/env";
import { recordUsage } from "@/lib/observability/usage";

export interface WebEvidence { title: string; url: string; text: string }
function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}
export async function searchWeb(question: string, requestId: string): Promise<WebEvidence[]> {
  const key = env.WEB_SEARCH_API_KEY || env.AI_API_KEY;
  if (!key) throw new Error("WEB_SEARCH_NOT_CONFIGURED");
  const started = Date.now();
  try {
    const response = await fetch(env.WEB_SEARCH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: question.slice(0, 500), max_results: 4 }),
      signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`WEB_SEARCH_HTTP_${response.status}`);
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("results" in payload) || !Array.isArray(payload.results)) throw new Error("WEB_SEARCH_INVALID_RESPONSE");
    const costValue = (payload as Record<string, unknown>).estimated_cost;
    const rawCost = typeof costValue === "object" && costValue !== null && "unit" in costValue
      ? (costValue as { unit: unknown }).unit : costValue;
    const numericCost = typeof rawCost === "number" || typeof rawCost === "string" ? Number(rawCost) : NaN;
    const searchCost = Number.isFinite(numericCost) && numericCost >= 0 ? numericCost : undefined;
    const results: WebEvidence[] = [];
    for (const item of payload.results) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const url = safeUrl(row.url);
      const text = typeof row.snippet === "string" ? row.snippet.trim().slice(0, 1800) : "";
      if (url && text) results.push({ title: typeof row.title === "string" ? row.title.slice(0, 180) : url, url, text });
    }
    await recordUsage({ requestId, operation: "search", modelName: "tavily-search", providerName: "avalai",
      inputTokens: 0, outputTokens: 0, estimated: true, durationMs: Date.now() - started,
      status: "completed", errorCategory: null, costAmountOverride: searchCost });
    return results;
  } catch (error) {
    await recordUsage({ requestId, operation: "search", modelName: "tavily-search", providerName: "avalai",
      inputTokens: 0, outputTokens: 0, estimated: true, durationMs: Date.now() - started,
      status: "failed", errorCategory: "provider_error" }).catch(() => {});
    throw error;
  }
}
