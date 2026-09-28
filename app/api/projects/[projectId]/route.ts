import { requireOwner } from "@/lib/auth/require-owner";
import { deleteProject, patchProject } from "@/lib/chat/project-service";
import { projectPatchSchema } from "@/lib/validation/chat";

type Context = { params: Promise<{ projectId: string }> };

export async function PATCH(request: Request, context: Context) {
  const ownerId = await requireOwner();
  const parsed = projectPatchSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است" }, { status: 422 });
  const { projectId } = await context.params;
  try {
    const project = patchProject(ownerId, projectId, parsed.data);
    return project ? Response.json(project) : Response.json({ error: "پروژه پیدا نشد" }, { status: 404 });
  } catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "انتقال پروژه انجام نشد" }, { status: 422 }); }
}

export async function DELETE(_: Request, context: Context) {
  const ownerId = await requireOwner();
  const { projectId } = await context.params;
  return deleteProject(ownerId, projectId)
    ? new Response(null, { status: 204 })
    : Response.json({ error: "پروژه پیدا نشد" }, { status: 404 });
}
