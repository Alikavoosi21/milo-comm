import { randomUUID } from "node:crypto";
import { requireOwner } from "@/lib/auth/require-owner";
import { persianError } from "@/lib/chat/errors";
import { isGenerationLeaseActive, registerGeneration, releaseGeneration } from "@/lib/chat/generation-registry";
import { snapshotReferences } from "@/lib/chat/reference-service";
import { appendMessage, getConversation, persistStore, store } from "@/lib/db/repositories";
import { prepareMemory } from "@/lib/memory/summary-service";
import { answerFromSources } from "@/lib/rag/answer-chain";
import { encodeEvent } from "@/lib/model/stream-events";
import { messageInputSchema } from "@/lib/validation/chat";

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  const ownerId = await requireOwner();
  const parsed = messageInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const { conversationId } = await context.params;
  const conversation = getConversation(ownerId, conversationId);
  if (!conversation) return Response.json({ error: "گفتگو پیدا نشد" }, { status: 404 });
  if (store.idempotency.has(ownerId + ":" + parsed.data.idempotencyKey)) return Response.json({ error: "این پیام قبلاً ارسال شده است" }, { status: 409 });

  const userMessage = appendMessage(conversation, {
    role: "user", content: parsed.data.content, status: "completed",
    attachmentIds: parsed.data.attachmentIds, referenceConversationIds: parsed.data.referenceConversationIds,
  });
  store.idempotency.set(ownerId + ":" + parsed.data.idempotencyKey, userMessage.id);
  snapshotReferences(ownerId, userMessage.id, parsed.data.referenceConversationIds);
  const assistant = appendMessage(conversation, {
    role: "assistant", content: "", status: "streaming", parentMessageId: userMessage.id,
    attachmentIds: [], referenceConversationIds: [],
  });
  persistStore();
  const lease = registerGeneration(conversation.id, conversation.revision, request.signal);
  const requestId = randomUUID();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Parameters<typeof encodeEvent>[0]) => controller.enqueue(encodeEvent(event));
      try {
        send({ type: "accepted", messageId: assistant.id });
        const memory = await prepareMemory(conversation, requestId);
        send({ type: "context_ready", truncated: memory.summarized });
        if (lease.signal.aborted) {
          assistant.status = "cancelled";
          send({ type: "cancelled", messageId: assistant.id });
          return;
        }
        send({ type: "generating" });
        const answer = await answerFromSources(userMessage.content, memory, requestId);
        if (lease.signal.aborted) {
          assistant.status = "cancelled";
          send({ type: "cancelled", messageId: assistant.id });
          return;
        }
        assistant.content = answer.text;
        assistant.citations = answer.citations;
        send({ type: "text_delta", text: answer.text });
        assistant.status = "completed";
        send({ type: "completed", messageId: assistant.id });
      } catch (error) {
        if (lease.signal.aborted) {
          assistant.status = "cancelled";
          try { send({ type: "cancelled", messageId: assistant.id }); } catch {}
        } else {
          assistant.status = "failed";
          try { send({ type: "failed", error: persianError(error) }); } catch {}
        }
      } finally {
        const current = store.conversations.get(conversation.id);
        if (current?.lifecycleState === "active" && isGenerationLeaseActive(conversation.id, lease.id, lease.revision)) {
          persistStore();
        }
        releaseGeneration(conversation.id, lease.id);
        try { controller.close(); } catch {}
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}

