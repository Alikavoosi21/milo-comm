import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendMessage, createConversation, store } from "@/lib/db/repositories";
import { forkMessage } from "@/lib/chat/branch-service";

vi.mock("@/lib/auth/require-owner", () => ({
  requireOwner: vi.fn(async () => "owner"),
}));

import { POST } from "@/app/api/messages/[messageId]/fork/route";

describe("message branching integration", () => {
  beforeEach(() => {
    store.conversations.clear();
    store.idempotency.clear();
  });

  it("advances only the new branch and keeps old output", () => {
    const chat = createConversation("owner");
    const user = appendMessage(chat, { role: "user", content: "الف", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    const old = appendMessage(chat, { role: "assistant", content: "پاسخ الف", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    const fork = forkMessage("owner", user.id, "ب");
    expect(chat.activeBranchId).toBe(fork?.branch.id);
    expect(chat.messages.find((item) => item.id === old.id)?.content).toBe("پاسخ الف");
    expect(fork?.message.content).toBe("ب");
  });

  it("rejects an active generation atomically and suppresses duplicate regeneration", async () => {
    const active = createConversation("owner");
    const activeUser = appendMessage(active, { role: "user", content: "فعال", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    appendMessage(active, { role: "assistant", content: "", status: "streaming", attachmentIds: [], referenceConversationIds: [] });
    const blocked = await POST(new Request("http://local/fork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "ویرایش", idempotencyKey: "active-generation-key" }),
    }), { params: Promise.resolve({ messageId: activeUser.id }) });
    expect(blocked.status).toBe(409);
    expect(active.branches).toHaveLength(1);

    const settled = createConversation("owner");
    const settledUser = appendMessage(settled, { role: "user", content: "اصلی", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    appendMessage(settled, { role: "assistant", content: "پاسخ", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    const body = JSON.stringify({ content: "ویرایش", idempotencyKey: "same-regeneration-key" });
    const first = await POST(new Request("http://local/fork", { method: "POST", headers: { "Content-Type": "application/json" }, body }), { params: Promise.resolve({ messageId: settledUser.id }) });
    const duplicate = await POST(new Request("http://local/fork", { method: "POST", headers: { "Content-Type": "application/json" }, body }), { params: Promise.resolve({ messageId: settledUser.id }) });
    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(settled.branches).toHaveLength(2);
  });
});
