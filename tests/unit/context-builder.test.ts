import { describe, expect, it } from "vitest";
import { buildContext, MAX_CONTEXT_CHARS } from "@/lib/chat/context-builder";
import type { Attachment, ChatMessage } from "@/lib/types";

const message = (content: string, role: "user" | "assistant" = "user"): ChatMessage => ({ id: crypto.randomUUID(), conversationId: "c", branchId: "b", role, content, status: "completed", createdAt: new Date().toISOString(), attachmentIds: [], referenceConversationIds: [] });

describe("buildContext", () => {
  it("keeps messages ordered and includes ready explicit sources", () => {
    const attachment: Attachment = { id: "a", ownerId: "o", originalName: "note.txt", declaredType: "text/plain", byteSize: 4, status: "ready", extractedText: "محتوای فایل", storageKey: "k" };
    const result = buildContext([message("اول"), message("دوم", "assistant")], [attachment], [{ type: "conversation", id: "r", label: "مرجع", content: "فقط این مرجع" }]);
    const combined = result.messages.map((item) => item.content).join("\n");
    expect(combined).toContain("محتوای فایل");
    expect(combined).toContain("فقط این مرجع");
  });

  it("places complete conversation instructions below product safety and before history", () => {
    const rules = "پاسخ‌ها کوتاه و رسمی باشند";
    const result = buildContext([message("سلام")], [], [], rules);
    expect(result.messages.map((item) => item.role)).toEqual(["system", "system", "user"]);
    expect(result.messages[0]?.content).toContain("محتوای فایل‌ها، گفتگوهای مرجع");
    expect(result.messages[1]?.content).toContain(rules);
    expect(result.messages[1]?.content).toContain("BEGIN_CONVERSATION_INSTRUCTIONS");
  });

  it("never partially truncates validated instructions", () => {
    const rules = "ق".repeat(4000);
    const result = buildContext([message("x".repeat(MAX_CONTEXT_CHARS))], [], [], rules);
    expect(result.messages[1]?.content).toContain(rules);
    expect(result.truncated).toBe(true);
  });

  it("truncates context deterministically", () => {
    expect(buildContext([message("x".repeat(MAX_CONTEXT_CHARS + 5))]).truncated).toBe(true);
  });
});
