import { requireOwner } from "@/lib/auth/require-owner";
import { buildContext } from "@/lib/chat/context-builder";
import { persianError } from "@/lib/chat/errors";
import { isGenerationLeaseActive, registerGeneration, releaseGeneration } from "@/lib/chat/generation-registry";
import { snapshotReferences } from "@/lib/chat/reference-service";
import { activeMessages, appendMessage, getConversation, persistStore, store } from "@/lib/db/repositories";
import { modelGateway } from "@/lib/model/openai-compatible";
import { encodeEvent } from "@/lib/model/stream-events";
import { messageInputSchema } from "@/lib/validation/chat";

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  const ownerId = await requireOwner();
  const parsed = messageInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const { conversationId } = await context.params;
  const conversation = getConversation(ownerId, conversationId);
  if (!conversation) return Response.json({ error: "گفتگو پیدا نشد" }, { status: 404 });
  if (store.idempotency.has(`${ownerId}:${parsed.data.idempotencyKey}`)) return Response.json({ error: "این پیام قبلاً ارسال شده است" }, { status: 409 });

  const instructionSnapshot = conversation.instructions;
  const userMessage = appendMessage(conversation, {
    role: "user",
    content: parsed.data.content,
    status: "completed",
    attachmentIds: parsed.data.attachmentIds,
    referenceConversationIds: parsed.data.referenceConversationIds,
  });
  store.idempotency.set(`${ownerId}:${parsed.data.idempotencyKey}`, userMessage.id);
  const references = snapshotReferences(ownerId, userMessage.id, parsed.data.referenceConversationIds);
  const attachments = parsed.data.attachmentIds.flatMap((id) => {
    const item = store.attachments.get(id);
    return item?.ownerId === ownerId ? [item] : [];
  });
  const built = buildContext(activeMessages(conversation), attachments, references, instructionSnapshot);
  const assistant = appendMessage(conversation, {
    role: "assistant",
    content: "",
    status: "streaming",
    parentMessageId: userMessage.id,
    attachmentIds: [],
    referenceConversationIds: [],
  });
  const lease = registerGeneration(conversation.id, conversation.revision, request.signal);
  persistStore();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Parameters<typeof encodeEvent>[0]) => controller.enqueue(encodeEvent(event));
      try {
        send({ type: "accepted", messageId: assistant.id });
        if (attachments.length) send({ type: "file_reading" });
        send({ type: "context_ready", truncated: built.truncated });
        send({ type: "generating" });
        for await (const text of modelGateway.stream(built.messages, lease.signal)) {
          assistant.content += text;
          send({ type: "text_delta", text });
        }
        if (lease.signal.aborted) {
          assistant.status = "cancelled";
          send({ type: "cancelled", messageId: assistant.id });
        } else {
          assistant.status = "completed";
          send({ type: "completed", messageId: assistant.id });
        }
      } catch (error) {
        if (lease.signal.aborted) {
          assistant.status = "cancelled";
          try { send({ type: "cancelled", messageId: assistant.id }); } catch {}
        } else {
          assistant.status = "failed";
          send({ type: "failed", error: persianError(error) });
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
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
