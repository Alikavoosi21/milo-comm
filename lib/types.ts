export type MessageRole = "user" | "assistant";
export type MessageState = "pending" | "streaming" | "completed" | "failed" | "cancelled";
export type AttachmentState = "selected" | "validating" | "uploading" | "extracting" | "ready" | "rejected" | "failed";
export type ConversationLifecycleState = "active" | "deleting";

export interface SourceCitation {
  sourceId: string;
  sourceName: string;
  chunkIndex: number;
  page?: number;
  url?: string;
}
export interface ChatMessage { id: string; conversationId: string; branchId: string; parentMessageId?: string; role: MessageRole; content: string; status: MessageState; createdAt: string; attachmentIds: string[]; referenceConversationIds: string[]; citations?: SourceCitation[] }
export interface ChatBranch { id: string; conversationId: string; label: string; headMessageId?: string; createdAt: string }
export interface Conversation {
  id: string;
  ownerId: string;
  title: string;
  projectId?: string | null;
  icon?: string;
  color?: string;
  instructions: string;
  revision: number;
  updatedAt: string;
  lifecycleState: ConversationLifecycleState;
  activeBranchId: string;
  createdAt: string;
  lastActivityAt: string;
  branches: ChatBranch[];
  messages: ChatMessage[];
  summary?: string;
  summarizedThroughMessageId?: string;
  summaryUpdatedAt?: string;
}
export interface ConversationMetadata {
  id: string;
  title: string;
  projectId?: string | null;
  icon?: string;
  color?: string;
  instructions: string;
  revision: number;
  updatedAt: string;
  lastActivityAt: string;
}
export interface ChatProject { id: string; ownerId: string; title: string; icon: string; color: string; parentProjectId?: string | null; createdAt: string; updatedAt: string }
export interface Attachment { id: string; ownerId: string; originalName: string; declaredType: string; detectedType?: string; byteSize: number; status: AttachmentState; extractedText?: string; error?: string; storageKey: string }
export interface ContextSource { type: "conversation" | "attachment"; id: string; label: string; content: string }
