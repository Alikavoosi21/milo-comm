import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConversation, store } from "@/lib/db/repositories";

const modelState = vi.hoisted(() => ({ owner: "owner", fail: false }));
vi.mock("@/lib/auth/require-owner", () => ({
  requireOwner: vi.fn(async () => modelState.owner),
}));
vi.mock("@/lib/model/openai-compatible", () => ({
  modelGateway: {
    async *stream(_messages: unknown[], signal?: AbortSignal) {
      if (modelState.fail) throw new Error("provider failed with sk-secret");
      for (const part of ["پاسخ ", "آزمایشی"]) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (signal?.aborted) return;
        yield part;
      }
    },
  },
}));

import { POST } from "@/app/api/conversations/[conversationId]/messages/route";

function request(conversationId: string, key: string, signal?: AbortSignal) {
  return POST(new Request(`http://local/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "این منبع چه می‌گوید؟",
      attachmentIds: [],
      referenceConversationIds: [],
      idempotencyKey: key,
    }),
    signal,
  }), { params: Promise.resolve({ conversationId }) });
}

describe("chat generation integration", () => {
  beforeEach(() => {
    store.conversations.clear();
    store.idempotency.clear();
    store.snapshots.clear();
    modelState.owner = "owner";
    modelState.fail = false;
  });

  it("persists owner-scoped states, streams named events, and rejects duplicate sends", async () => {
    const conversation = createConversation("owner");
    const response = await request(conversation.id, "same-key");
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("event: accepted");
    expect(body).toContain("event: context_ready");
    expect(body).toContain("event: generating");
    expect(body).toContain("event: text_delta");
    expect(body).toContain("event: completed");
    expect(conversation.messages.map((message) => message.status)).toEqual(["completed", "completed"]);

    const duplicate = await request(conversation.id, "same-key");
    expect(duplicate.status).toBe(409);

    modelState.owner = "intruder";
    const foreign = await request(conversation.id, "foreign-key");
    expect(foreign.status).toBe(404);
  });

  it("returns the exact no-source answer without invoking the provider and preserves cancellation", async () => {
    const failedConversation = createConversation("owner");
    modelState.fail = true;
    const failed = await request(failedConversation.id, "failed-key");
    expect(await failed.text()).toContain("متاسفانه خواسته شما در منابع تعیین شده وجود ندارد، لطفا منبع مناسب این سوال رو وارد کنید");
    expect(failedConversation.messages.at(-1)?.status).toBe("completed");

    modelState.fail = false;
    const cancelledConversation = createConversation("owner");
    const controller = new AbortController();
    const responsePromise = request(cancelledConversation.id, "cancel-key", controller.signal);
    controller.abort();
    const response = await responsePromise;
    await response.text();
    expect(cancelledConversation.messages.at(-1)?.status).toBe("cancelled");
  });
});

