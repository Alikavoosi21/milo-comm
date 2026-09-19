import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { createConversation, listConversations } from "@/lib/db/repositories";

export async function GET() {
  const ownerId = await requireOwner();
  return NextResponse.json(listConversations(ownerId));
}

export async function POST() {
  const ownerId = await requireOwner();
  return NextResponse.json(createConversation(ownerId), { status: 201 });
}
