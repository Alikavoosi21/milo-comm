import { describe, expect, it } from "vitest";
import { registerGeneration } from "@/lib/chat/generation-registry";
import { deleteConversation } from "@/lib/chat/conversation-lifecycle";
import { appendMessage, createConversation, getConversation, store } from "@/lib/db/repositories";

describe("conversation deletion lifecycle", () => {
  it("does not reveal or delete a foreign conversation", async () => {
    const conversation = createConversation("alice");
    await expect(deleteConversation("bob", conversation.id)).resolves.toEqual({ status: "not_found" });
    expect(getConversation("alice", conversation.id)).toBeDefined();
  });

  it("removes its graph, derived snapshots and exclusive attachments but keeps shared attachments", async () => {
    const target = createConversation("owner");
    const other = createConversation("owner");
    const exclusiveId = crypto.randomUUID();
    const sharedId = crypto.randomUUID();
    store.attachments.set(exclusiveId, { id: exclusiveId, ownerId: "owner", originalName: "one.txt", declaredType: "text/plain", byteSize: 1, status: "ready", storageKey: "missing-exclusive" });
    store.attachments.set(sharedId, { id: sharedId, ownerId: "owner", originalName: "shared.txt", declaredType: "text/plain", byteSize: 1, status: "ready", storageKey: "missing-shared" });
    const targetMessage = appendMessage(target, { role: "user", content: "هدف", status: "completed", attachmentIds: [exclusiveId, sharedId], referenceConversationIds: [] });
    const otherMessage = appendMessage(other, { role: "user", content: "دیگر", status: "completed", attachmentIds: [sharedId], referenceConversationIds: [target.id] });
    store.snapshots.set(targetMessage.id, [{ type: "attachment", id: exclusiveId, label: "فایل", content: "x" }]);
    store.snapshots.set(otherMessage.id, [{ type: "conversation", id: target.id, label: target.title, content: "snapshot" }]);

    const lease = registerGeneration(target.id, target.revision);
    await expect(deleteConversation("owner", target.id)).resolves.toEqual({ status: "deleted" });

    expect(lease.signal.aborted).toBe(true);
    expect(store.conversations.has(target.id)).toBe(false);
    expect(store.snapshots.has(targetMessage.id)).toBe(false);
    expect(store.snapshots.has(otherMessage.id)).toBe(false);
    expect(store.attachments.has(exclusiveId)).toBe(false);
    expect(store.attachments.has(sharedId)).toBe(true);
    expect(other.messages).toHaveLength(1);
  });
});
