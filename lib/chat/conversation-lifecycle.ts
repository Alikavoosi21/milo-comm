import { cancelGeneration } from "@/lib/chat/generation-registry";
import { persistStore, store } from "@/lib/db/repositories";
import { deletePrivateFile } from "@/lib/files/storage";
import { logEvent } from "@/lib/observability/logger";

export type DeleteConversationResult =
  | { status: "deleted" }
  | { status: "not_found" }
  | { status: "conflict" };

export async function deleteConversation(ownerId: string, conversationId: string): Promise<DeleteConversationResult> {
  const startedAt = Date.now();
  const conversation = store.conversations.get(conversationId);
  if (!conversation || conversation.ownerId !== ownerId) return { status: "not_found" };
  if (conversation.lifecycleState === "deleting") return { status: "conflict" };

  conversation.lifecycleState = "deleting";
  conversation.revision += 1;
  conversation.updatedAt = new Date().toISOString();
  persistStore();
  cancelGeneration(conversationId);

  const deletedMessageIds = new Set(conversation.messages.map((message) => message.id));
  const candidateAttachmentIds = new Set(conversation.messages.flatMap((message) => message.attachmentIds));
  const sharedAttachmentIds = new Set(
    [...store.conversations.values()]
      .filter((item) => item.id !== conversationId)
      .flatMap((item) => item.messages)
      .flatMap((message) => message.attachmentIds),
  );

  for (const [messageId, sources] of [...store.snapshots.entries()]) {
    if (deletedMessageIds.has(messageId)) {
      store.snapshots.delete(messageId);
      continue;
    }
    const remaining = sources.filter((source) => !(source.type === "conversation" && source.id === conversationId));
    if (remaining.length) store.snapshots.set(messageId, remaining);
    else store.snapshots.delete(messageId);
  }

  for (const [key, messageId] of [...store.idempotency.entries()]) {
    if (deletedMessageIds.has(messageId)) store.idempotency.delete(key);
  }

  const storageKeys: string[] = [];
  for (const attachmentId of candidateAttachmentIds) {
    if (sharedAttachmentIds.has(attachmentId)) continue;
    const attachment = store.attachments.get(attachmentId);
    if (!attachment) continue;
    storageKeys.push(attachment.storageKey);
    store.attachments.delete(attachmentId);
  }

  store.conversations.delete(conversationId);
  persistStore();

  const cleanup = await Promise.allSettled(storageKeys.map((key) => deletePrivateFile(key)));
  const failedCleanup = cleanup.filter((result) => result.status === "rejected").length;
  logEvent("conversation.delete", {
    conversationId,
    outcome: failedCleanup ? "deleted_with_cleanup_error" : "deleted",
    cleanupFailures: failedCleanup,
    durationMs: Date.now() - startedAt,
  });
  return { status: "deleted" };
}
