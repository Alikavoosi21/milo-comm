import { randomUUID } from "node:crypto";
import { appendMessage, store } from "@/lib/db/repositories";
import type { ChatMessage, Conversation } from "@/lib/types";

export function forkMessage(ownerId: string, messageId: string, content: string) {
  const conversation = [...store.conversations.values()].find(
    (item: Conversation) => item.ownerId === ownerId && item.messages.some((message: ChatMessage) => message.id === messageId),
  );
  if (!conversation) return undefined;
  const original = conversation.messages.find((item: ChatMessage) => item.id === messageId);
  if (!original || original.role !== "user") return undefined;
  const branch = {
    id: randomUUID(),
    conversationId: conversation.id,
    label: `مسیر ${conversation.branches.length + 1}`,
    headMessageId: undefined,
    createdAt: new Date().toISOString(),
  };
  conversation.branches.push(branch);
  conversation.activeBranchId = branch.id;
  const previous = conversation.messages.filter((message: ChatMessage) => message.branchId === original.branchId);
  for (const message of previous) {
    if (message.id === original.id) break;
    conversation.messages.push({ ...message, id: randomUUID(), branchId: branch.id });
  }
  return {
    conversation,
    branch,
    message: appendMessage(conversation, {
      role: "user",
      content,
      status: "completed",
      parentMessageId: original.parentMessageId,
      attachmentIds: [],
      referenceConversationIds: [],
      branchId: branch.id,
    }),
  };
}


