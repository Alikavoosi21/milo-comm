import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendMessage, createConversation, store } from "@/lib/db/repositories";
import { forkInputSchema } from "@/lib/validation/chat";

vi.mock("@/lib/auth/require-owner", () => ({
  requireOwner: vi.fn(async () => "owner"),
}));

import { POST } from "@/app/api/messages/[messageId]/fork/route";

describe("message fork contract", () => {
  beforeEach(() => store.conversations.clear());

  it("requires non-empty edited content", () => {
    expect(forkInputSchema.safeParse({ content: "پیام تازه" }).success).toBe(true);
    expect(forkInputSchema.safeParse({ content: "  " }).success).toBe(false);
  });

  it("returns 409 while the source conversation has an active generation", async () => {
    const conversation = createConversation("owner");
    const user = appendMessage(conversation, {
      role: "user",
      content: "پیام",
      status: "completed",
      attachmentIds: [],
      referenceConversationIds: [],
    });
    appendMessage(conversation, {
      role: "assistant",
      content: "",
      status: "streaming",
      attachmentIds: [],
      referenceConversationIds: [],
    });
    const response = await POST(new Request("http://local/api/fork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "ویرایش" }),
    }), { params: Promise.resolve({ messageId: user.id }) });
    expect(response.status).toBe(409);
  });
});
