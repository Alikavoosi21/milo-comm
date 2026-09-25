import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { env } from "@/lib/validation/env";
import { estimateTokens, recordUsage, type UsageOperation } from "@/lib/observability/usage";

export async function askGroundedModel(
  system: string, user: string, operation: Extract<UsageOperation, "answer" | "summarize" | "rewrite">, requestId: string
) {
  const start = Date.now();
  if (env.MOCK_AI === "true") throw new Error("MOCK_MODEL_HANDLED_BY_CALLER");
  if (!env.AI_API_KEY) throw new Error("AI_NOT_CONFIGURED");
  try {
    const model = new ChatOpenAI({
      model: env.AI_MODEL, temperature: 0, apiKey: env.AI_API_KEY,
      configuration: { baseURL: env.AI_BASE_URL },
      timeout: env.AI_TIMEOUT_MS,
    });
    const result = await model.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const content = typeof result.content === "string" ? result.content : "";
    await recordUsage({
      requestId, operation, modelName: env.AI_MODEL, providerName: "openai-compatible",
      inputTokens: result.usage_metadata?.input_tokens ?? estimateTokens(system + user),
      outputTokens: result.usage_metadata?.output_tokens ?? estimateTokens(content),
      estimated: !result.usage_metadata, durationMs: Date.now() - start,
      status: "completed", errorCategory: null,
    });
    return content;
  } catch (error) {
    await recordUsage({
      requestId, operation, modelName: env.AI_MODEL, providerName: "openai-compatible",
      inputTokens: estimateTokens(system + user), outputTokens: null,
      estimated: true, durationMs: Date.now() - start,
      status: "failed", errorCategory: "provider_error",
    });
    throw error;
  }
}
