import { randomUUID } from "node:crypto";
import { requireOwner } from "@/lib/auth/require-owner";
import { forkMessage } from "@/lib/chat/branch-service";
import { persianError } from "@/lib/chat/errors";
import { isGenerationLeaseActive, registerGeneration, releaseGeneration } from "@/lib/chat/generation-registry";
import { appendMessage, persistStore, store } from "@/lib/db/repositories";
import { prepareMemory } from "@/lib/memory/summary-service";
import { answerFromSources } from "@/lib/rag/answer-chain";
import { forkInputSchema } from "@/lib/validation/chat";

export async function POST(request: Request, context: { params: Promise<{ messageId: string }> }) {
  const ownerId = await requireOwner();
  const body = forkInputSchema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: "متن ویرایش‌شده معتبر نیست" }, { status: 422 });
  const { messageId } = await context.params;
  const sourceConversation = [...store.conversations.values()].find((item) =>
    item.ownerId === ownerId && item.lifecycleState === "active" && item.messages.some((message) => message.id === messageId));
  if (sourceConversation?.messages.some((message) => message.status === "streaming")) {
    return Response.json({ error: "ابتدا تولید پاسخ جاری را متوقف کنید" }, { status: 409 });
  }

  const idempotencyId = body.data.idempotencyKey ? "fork:" + ownerId + ":" + body.data.idempotencyKey : undefined;
  if (idempotencyId && store.idempotency.has(idempotencyId)) {
    return Response.json({ error: "این بازتولید قبلاً انجام شده است" }, { status: 409 });
  }

  const result = forkMessage(ownerId, messageId, body.data.content);
  if (!result) return Response.json({ error: "پیام پیدا نشد" }, { status: 404 });
  if (idempotencyId) store.idempotency.set(idempotencyId, result.message.id);
  persistStore();
  const lease = registerGeneration(result.conversation.id, result.conversation.revision, request.signal);
  const requestId = randomUUID();
  try {
    const memory = await prepareMemory(result.conversation, requestId);
    const answer = await answerFromSources(result.message.content, memory, requestId);
    const current = store.conversations.get(result.conversation.id);
    if (!current || current.lifecycleState !== "active" || !isGenerationLeaseActive(current.id, lease.id, lease.revision)) {
      return Response.json({ error: "گفتگو حذف یا تولید متوقف شد" }, { status: 409 });
    }
    const assistant = appendMessage(result.conversation, {
      role: "assistant",
      content: answer.text,
      citations: answer.citations,
      status: "completed",
      parentMessageId: result.message.id,
      attachmentIds: [],
      referenceConversationIds: [],
      branchId: result.branch.id,
    });
    persistStore();
    return Response.json({ branch: result.branch, message: result.message, assistant }, { status: 201 });
  } catch (error) {
    return Response.json({ error: persianError(error) }, { status: 503 });
  } finally {
    releaseGeneration(result.conversation.id, lease.id);
  }
}
