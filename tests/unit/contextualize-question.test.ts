import { describe, expect, it } from "vitest";
import { contextualizeQuestion, isContextualFollowUp, preferContextualQuestion } from "@/lib/memory/contextualize-question";
import type { ActiveMemory } from "@/lib/memory/summary-service";

const message = (content: string, role: "user" | "assistant" = "user") => ({
  id: content, conversationId: "same-conversation", branchId: "main", role,
  content, status: "completed" as const, createdAt: "2026-09-25T00:00:00.000Z",
  attachmentIds: [], referenceConversationIds: [],
});

describe("conversation question context", () => {
  it("recognizes referential follow-ups without rewriting independent questions", async () => {
    expect(isContextualFollowUp("درباره‌اش بیشتر بگو")).toBe(true);
    expect(isContextualFollowUp("چرا؟")).toBe(true);
    expect(isContextualFollowUp("بودجهٔ پروژه آذر چقدر است؟")).toBe(false);
    const memory: ActiveMemory = { summary: "موضوع فعال: پروژه آذر", recent: [message("بودجهٔ پروژه آذر چقدر است؟")], summarized: false };
    expect(await contextualizeQuestion("بودجهٔ پروژه آذر چقدر است؟", memory, "request-independent")).toBe("بودجهٔ پروژه آذر چقدر است؟");
  });

  it("uses the previous user turn for a follow-up in the same conversation", async () => {
    const memory: ActiveMemory = { summary: "", recent: [
      message("بودجهٔ پروژه آذر چقدر است؟"), message("بودجه برابر دویست تومان است.", "assistant"), message("درباره‌اش بیشتر بگو"),
    ], summarized: false };
    const resolved = await contextualizeQuestion("درباره‌اش بیشتر بگو", memory, "request-recent");
    expect(resolved).toContain("پروژه آذر");
    expect(resolved).toContain("درباره‌اش بیشتر بگو");
  });

  it("uses the summary when the previous turn was pruned from active memory", async () => {
    const memory: ActiveMemory = { summary: "موضوع فعال گفتگو بودجهٔ پروژه آذر و مبلغ دویست تومان است.",
      recent: [message("درباره‌اش بیشتر بگو")], summarized: true };
    const resolved = await contextualizeQuestion("درباره‌اش بیشتر بگو", memory, "request-summary");
    expect(resolved).toContain("پروژه آذر");
  });

  it("keeps the saved topic when the model returns the same ambiguous question", () => {
    expect(preferContextualQuestion("درباره‌اش بیشتر بگو", "درباره‌اش بیشتر بگو", "بودجه پروژه آذر؛ درباره‌اش بیشتر بگو"))
      .toContain("پروژه آذر");
  });
});
