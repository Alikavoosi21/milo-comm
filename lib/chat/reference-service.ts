import { activeMessages, getConversation, persistStore, store } from "@/lib/db/repositories";
import type { ContextSource } from "@/lib/types";

export function snapshotReferences(ownerId: string, messageId: string, ids: string[]) {
  const sources: ContextSource[] = ids.flatMap((id) => {
    const conversation = getConversation(ownerId, id);
    if (!conversation) return [];
    return [{ type: "conversation" as const, id, label: conversation.title, content: activeMessages(conversation).map((m) => `${m.role}: ${m.content}`).join("\n") }];
  });
  store.snapshots.set(messageId, sources); persistStore();
  return sources;
}

