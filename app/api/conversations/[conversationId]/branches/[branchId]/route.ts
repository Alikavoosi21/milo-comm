import { requireOwner } from "@/lib/auth/require-owner";
import { getConversation, persistStore } from "@/lib/db/repositories";
import type { ChatBranch } from "@/lib/types";

export async function PUT(_: Request, context: { params: Promise<{ conversationId: string; branchId: string }> }) {
  const ownerId = await requireOwner();
  const { conversationId, branchId } = await context.params;
  const conversation = getConversation(ownerId, conversationId);
  if (!conversation || !conversation.branches.some((branch: ChatBranch) => branch.id === branchId)) return Response.json({ error: "مسیر پیدا نشد" }, { status: 404 });
  conversation.activeBranchId = branchId; persistStore();
  return Response.json({ activeBranchId: branchId });
}


