import { describe, expect, it } from "vitest";
import { buildContext } from "@/lib/chat/context-builder";
import { activeMessages, appendMessage, createConversation, patchConversation } from "@/lib/db/repositories";

describe("conversation instruction isolation", () => {
  it("stores rules per conversation and includes them below product safety", () => {
    const a = createConversation("owner");
    const b = createConversation("owner");
    appendMessage(a, { role: "user", content: "پیام A", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    appendMessage(b, { role: "user", content: "پیام B", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    const updated = patchConversation("owner", a.id, { instructions: "فقط رسمی پاسخ بده", expectedRevision: a.revision });
    expect(updated.status).toBe("updated");

    const contextA = buildContext(activeMessages(a), [], [], a.instructions);
    const contextB = buildContext(activeMessages(b), [], [], b.instructions);
    expect(contextA.messages[0]?.content).toContain("الزامات ایمنی یا حریم خصوصی");
    expect(contextA.messages[1]?.role).toBe("system");
    expect(contextA.messages[1]?.content).toContain("فقط رسمی");
    expect(contextB.messages.map((item) => item.content).join("\n")).not.toContain("فقط رسمی");
  });

  it("detects a stale revision without overwriting the valid value", () => {
    const conversation = createConversation("owner");
    const originalRevision = conversation.revision;
    expect(patchConversation("owner", conversation.id, { instructions: "نسخه اول", expectedRevision: originalRevision }).status).toBe("updated");
    const conflict = patchConversation("owner", conversation.id, { instructions: "نسخه قدیمی", expectedRevision: originalRevision });
    expect(conflict.status).toBe("conflict");
    expect(conversation.instructions).toBe("نسخه اول");
  });

  it("keeps the generation-start snapshot when instructions change mid-generation", () => {
    const conversation = createConversation("owner");
    patchConversation("owner", conversation.id, { instructions: "قاعده نخست", expectedRevision: conversation.revision });
    const generationSnapshot = conversation.instructions;
    patchConversation("owner", conversation.id, { instructions: "قاعده دوم", expectedRevision: conversation.revision });
    const inFlight = buildContext([], [], [], generationSnapshot).messages.map((item) => item.content).join("\n");
    const next = buildContext([], [], [], conversation.instructions).messages.map((item) => item.content).join("\n");
    expect(inFlight).toContain("قاعده نخست");
    expect(inFlight).not.toContain("قاعده دوم");
    expect(next).toContain("قاعده دوم");
  });
});
