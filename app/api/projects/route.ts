import { requireOwner } from "@/lib/auth/require-owner";
import { createProject, listProjects } from "@/lib/chat/project-service";
import { projectInputSchema } from "@/lib/validation/chat";

export async function GET() {
  const ownerId = await requireOwner();
  return Response.json(listProjects(ownerId));
}

export async function POST(request: Request) {
  const ownerId = await requireOwner();
  const parsed = projectInputSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است" }, { status: 422 });
  try { return Response.json(createProject(ownerId, parsed.data), { status: 201 }); }
  catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "ساخت پروژه انجام نشد" }, { status: 422 }); }
}
