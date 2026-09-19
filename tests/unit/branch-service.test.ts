import { beforeEach, describe, expect, it } from "vitest";
import { createConversation, appendMessage, store } from "@/lib/db/repositories";
import { forkMessage } from "@/lib/chat/branch-service";

describe("forkMessage", () => {
  beforeEach(() => store.conversations.clear());
  it("creates an append-only branch and preserves the original", () => {
    const conversation = createConversation("owner");
    const original = appendMessage(conversation, { role: "user", content: "قدیمی", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    appendMessage(conversation, { role: "assistant", content: "پاسخ قدیمی", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    const result = forkMessage("owner", original.id, "جدید");
    expect(result?.branch.id).not.toBe(original.branchId); expect(conversation.messages.some((item) => item.content === "پاسخ قدیمی")).toBe(true); expect(result?.message.content).toBe("جدید");
  });
});
