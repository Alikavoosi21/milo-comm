import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { createConversation, listConversations, store } from "@/lib/db/repositories";

export async function GET() {
  const ownerId = await requireOwner();
  return NextResponse.json(listConversations(ownerId));
}

export async function POST(request: Request) {
  const ownerId = await requireOwner();
  const body = await request.json().catch(() => ({}));
  const projectId = body && typeof body === "object" && "projectId" in body ? body.projectId : null;
  if (projectId !== null && (typeof projectId !== "string" || store.projects.get(projectId)?.ownerId !== ownerId)) {
    return NextResponse.json({ error: "پروژه پیدا نشد" }, { status: 404 });
  }
  return NextResponse.json(createConversation(ownerId, projectId), { status: 201 });
}
