import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Attachment, ChatBranch, ChatMessage, Conversation, ConversationMetadata, ContextSource } from "@/lib/types";

interface Store {
  conversations: Map<string, Conversation>;
  attachments: Map<string, Attachment>;
  snapshots: Map<string, ContextSource[]>;
  idempotency: Map<string, string>;
  themes: Map<string, "light" | "dark">;
}

export interface ConversationPatchInput {
  title?: string;
  instructions?: string;
  expectedRevision: number;
}

export type ConversationPatchResult =
  | { status: "updated"; conversation: Conversation }
  | { status: "conflict"; conversation: Conversation }
  | { status: "not_found" };

const dataFile = path.join(process.cwd(), ".data", "store.json");
const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

function normalizeConversation(value: Conversation): Conversation {
  const now = value.updatedAt ?? value.lastActivityAt ?? value.createdAt ?? new Date().toISOString();
  return {
    ...value,
    instructions: typeof value.instructions === "string" ? value.instructions : "",
    revision: Number.isInteger(value.revision) && value.revision > 0 ? value.revision : 1,
    updatedAt: now,
    lifecycleState: value.lifecycleState === "deleting" ? "deleting" : "active",
    branches: value.branches ?? [],
    messages: value.messages ?? [],
  };
}

function loadStore(): Store | undefined {
  if (isTest) return undefined;
  try {
    if (!existsSync(dataFile)) return undefined;
    const value = JSON.parse(readFileSync(dataFile, "utf8"));
    return {
      conversations: new Map((value.conversations ?? []).map(([id, conversation]: [string, Conversation]) => [id, normalizeConversation(conversation)])),
      attachments: new Map(value.attachments ?? []),
      snapshots: new Map(value.snapshots ?? []),
      idempotency: new Map(value.idempotency ?? []),
      themes: new Map(value.themes ?? []),
    };
  } catch {
    return undefined;
  }
}

const globalStore = globalThis as typeof globalThis & { __miloStore?: Store };
export const store: Store = (globalStore.__miloStore ??= loadStore() ?? {
  conversations: new Map(),
  attachments: new Map(),
  snapshots: new Map(),
  idempotency: new Map(),
  themes: new Map(),
});

export function persistStore() {
  if (isTest) return;
  mkdirSync(path.dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify({
    conversations: [...store.conversations],
    attachments: [...store.attachments],
    snapshots: [...store.snapshots],
    idempotency: [...store.idempotency],
    themes: [...store.themes],
  }), "utf8");
}

export function conversationMetadata(conversation: Conversation): ConversationMetadata {
  return {
    id: conversation.id,
    title: conversation.title,
    instructions: conversation.instructions,
    revision: conversation.revision,
    updatedAt: conversation.updatedAt,
    lastActivityAt: conversation.lastActivityAt,
  };
}

export function createConversation(ownerId: string): Conversation {
  const now = new Date().toISOString();
  const id = randomUUID();
  const branch: ChatBranch = { id: randomUUID(), conversationId: id, label: "مسیر اصلی", createdAt: now };
  const conversation: Conversation = {
    id,
    ownerId,
    title: "گفتگوی جدید",
    instructions: "",
    revision: 1,
    updatedAt: now,
    lifecycleState: "active",
    activeBranchId: branch.id,
    createdAt: now,
    lastActivityAt: now,
    branches: [branch],
    messages: [],
  };
  store.conversations.set(id, conversation);
  persistStore();
  return conversation;
}

export function getConversation(ownerId: string, id: string) {
  const value = store.conversations.get(id);
  return value?.ownerId === ownerId && value.lifecycleState === "active" ? value : undefined;
}

export function listConversations(ownerId: string) {
  return [...store.conversations.values()]
    .filter((item) => item.ownerId === ownerId && item.lifecycleState === "active")
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export function patchConversation(ownerId: string, id: string, input: ConversationPatchInput): ConversationPatchResult {
  const conversation = store.conversations.get(id);
  if (!conversation || conversation.ownerId !== ownerId) return { status: "not_found" };
  if (conversation.lifecycleState !== "active" || conversation.revision !== input.expectedRevision) {
    return { status: "conflict", conversation };
  }

  if (input.title !== undefined) conversation.title = input.title.trim();
  if (input.instructions !== undefined) conversation.instructions = input.instructions.trim();
  conversation.revision += 1;
  conversation.updatedAt = new Date().toISOString();
  persistStore();
  return { status: "updated", conversation };
}

export function appendMessage(
  conversation: Conversation,
  input: Omit<ChatMessage, "id" | "createdAt" | "conversationId" | "branchId"> & { branchId?: string },
) {
  if (conversation.lifecycleState !== "active") throw new Error("CONVERSATION_NOT_ACTIVE");
  const branchId = input.branchId ?? conversation.activeBranchId;
  const message: ChatMessage = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    conversationId: conversation.id,
    branchId,
  };
  conversation.messages.push(message);
  const branch = conversation.branches.find((item) => item.id === branchId);
  if (branch) branch.headMessageId = message.id;
  conversation.lastActivityAt = message.createdAt;
  if (conversation.title === "گفتگوی جدید" && message.role === "user") {
    conversation.title = message.content.slice(0, 42);
    conversation.updatedAt = message.createdAt;
    conversation.revision += 1;
  }
  persistStore();
  return message;
}

export function activeMessages(conversation: Conversation, branchId = conversation.activeBranchId) {
  return conversation.messages.filter((message) => message.branchId === branchId);
}

export function resetStore() {
  store.conversations.clear();
  store.attachments.clear();
  store.snapshots.clear();
  store.idempotency.clear();
  store.themes.clear();
}
