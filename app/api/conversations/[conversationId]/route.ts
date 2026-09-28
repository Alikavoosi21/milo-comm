import { requireOwner } from "@/lib/auth/require-owner";
import { deleteConversation } from "@/lib/chat/conversation-lifecycle";
import { conversationMetadata, getConversation, patchConversation } from "@/lib/db/repositories";
import { logEvent } from "@/lib/observability/logger";
import { conversationPatchSchema } from "@/lib/validation/chat";

export async function GET(_: Request, context: { params: Promise<{ conversationId: string }> }) {
  const ownerId = await requireOwner();
  const { conversationId } = await context.params;
  const conversation = getConversation(ownerId, conversationId);
  return conversation ? Response.json(conversation) : Response.json({ error: "گفتگو پیدا نشد" }, { status: 404 });
}

export async function PATCH(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  const startedAt = Date.now();
  const ownerId = await requireOwner();
  const body = await request.json().catch(() => undefined);
  const parsed = conversationPatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "درخواست معتبر نیست" }, { status: 422 });

  const { conversationId } = await context.params;
  const result = patchConversation(ownerId, conversationId, parsed.data);
  if (result.status === "not_found") return Response.json({ error: "گفتگو پیدا نشد" }, { status: 404 });
  if (result.status === "invalid_project") return Response.json({ error: "پروژه پیدا نشد" }, { status: 404 });
  if (result.status === "conflict") {
    return Response.json({
      error: result.conversation.lifecycleState === "deleting" ? "گفتگو در حال حذف است" : "گفتگو در جای دیگری تغییر کرده است؛ نسخه تازه را بررسی کنید.",
      current: conversationMetadata(result.conversation),
    }, { status: 409 });
  }

  logEvent("conversation.patch", {
    conversationId,
    fields: Object.keys(parsed.data).filter((key) => key !== "expectedRevision").join(","),
    outcome: "updated",
    durationMs: Date.now() - startedAt,
  });
  return Response.json({ conversation: conversationMetadata(result.conversation) });
}

export async function DELETE(_: Request, context: { params: Promise<{ conversationId: string }> }) {
  const ownerId = await requireOwner();
  const { conversationId } = await context.params;
  const result = await deleteConversation(ownerId, conversationId);
  if (result.status === "not_found") return Response.json({ error: "گفتگو پیدا نشد" }, { status: 404 });
  if (result.status === "conflict") return Response.json({ error: "حذف گفتگو در حال انجام است" }, { status: 409 });
  return new Response(null, { status: 204 });
}
