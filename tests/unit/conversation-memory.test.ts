import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendMessage, createConversation, store } from "@/lib/db/repositories";
import { prepareMemory } from "@/lib/memory/summary-service";
import { env } from "@/lib/validation/env";

vi.mock("@/lib/rag/chat-model", () => ({
  askGroundedModel: vi.fn(async () => { throw new Error("summary provider unavailable"); }),
}));

beforeEach(() => { store.conversations.clear(); });
describe("conversation memory failure safety", () => {
  it("keeps the full transcript and previous checkpoint when summarization fails", async () => {
    const conversation = createConversation("owner");
    for (let index = 0; index < 10; index++) {
      appendMessage(conversation, {
        role: "user", content: "پیام شمارهٔ " + index + " " + "الف".repeat(5500),
        status: "completed", attachmentIds: [], referenceConversationIds: [],
      });
    }
    const originalLength = conversation.messages.length;
    const originalMode = env.MOCK_AI;
    env.MOCK_AI = "false";
    try { await expect(prepareMemory(conversation)).rejects.toThrow("summary provider unavailable"); }
    finally { env.MOCK_AI = originalMode; }
    expect(conversation.messages).toHaveLength(originalLength);
    expect(conversation.summary).toBeUndefined();
    expect(conversation.summarizedThroughMessageId).toBeUndefined();
  });
});
