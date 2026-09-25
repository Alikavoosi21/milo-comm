import { randomUUID } from "node:crypto";
import type { Conversation, ChatMessage } from "@/lib/types";
import { activeMessages, persistStore } from "@/lib/db/repositories";
import { env } from "@/lib/validation/env";
import { estimateTokens, recordUsage } from "@/lib/observability/usage";
import { askGroundedModel } from "@/lib/rag/chat-model";

export interface ActiveMemory { summary: string; recent: ChatMessage[]; summarized: boolean }
export async function prepareMemory(conversation: Conversation, requestId = randomUUID()): Promise<ActiveMemory> {
  const messages = activeMessages(conversation).filter((item) => item.status === "completed");
  let summary = conversation.summary ?? "";
  let checkpoint = messages.findIndex((item) => item.id === conversation.summarizedThroughMessageId);
  if (checkpoint < 0) { summary = ""; checkpoint = -1; }
  const unsummarized = messages.slice(checkpoint + 1);
  const activeTokens = estimateTokens(summary + unsummarized.map((item) => item.content).join("\n"));
  if (activeTokens <= env.MEMORY_ACTIVE_TOKEN_LIMIT || unsummarized.length <= env.MEMORY_RECENT_MESSAGES) {
    return { summary, recent: unsummarized, summarized: false };
  }
  const older = unsummarized.slice(0, -env.MEMORY_RECENT_MESSAGES);
  const recent = unsummarized.slice(-env.MEMORY_RECENT_MESSAGES);
  const history = older.map((item) => (item.role === "user" ? "کاربر: " : "دستیار: ") + item.content).join("\n");
  let nextSummary: string;
  if (env.MOCK_AI === "true") {
    nextSummary = (summary + "\n" + history).slice(-env.MEMORY_SUMMARY_TOKEN_LIMIT * 4);
    await recordUsage({
      requestId, operation: "summarize", modelName: "mock", providerName: "local",
      inputTokens: estimateTokens(summary + history), outputTokens: estimateTokens(nextSummary),
      estimated: true, durationMs: 0, status: "completed", errorCategory: null,
    });
  } else {
    nextSummary = await askGroundedModel(
      "خلاصهٔ کوتاه و وفادار به همین گفتگو بنویس. موضوع فعال، نام اشخاص و چیزهایی که کاربر به آن‌ها ارجاع می‌دهد، آخرین پرسش باز، هدف‌ها و ترجیح‌ها را حفظ کن تا پرسش‌های پیگیری مثل «درباره‌اش» قابل فهم بمانند. پاسخ‌های قبلی را منبع مستقل حقیقت ندان. هیچ واقعیت تازه‌ای اضافه نکن. حداکثر " + env.MEMORY_SUMMARY_TOKEN_LIMIT + " توکن.",
      "خلاصهٔ قبلی:\n" + summary + "\nپیام‌های قدیمی:\n" + history,
      "summarize", requestId
    );
  }
  if (!nextSummary.trim()) throw new Error("MEMORY_SUMMARY_EMPTY");
  conversation.summary = nextSummary.trim();
  conversation.summarizedThroughMessageId = older.at(-1)?.id;
  conversation.summaryUpdatedAt = new Date().toISOString();
  persistStore();
  return { summary: conversation.summary, recent, summarized: true };
}
