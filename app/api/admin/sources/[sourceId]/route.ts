import { isAdmin, sameOrigin } from "@/lib/auth/admin-session";
import { deleteKnowledgeSource, replaceKnowledgeSource, SourceError } from "@/lib/rag/source-service";

type Context = { params: Promise<{ sourceId: string }> };
export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return Response.json({ error: "دسترسی ادمین لازم است." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const { sourceId } = await context.params;
  const form = await request.formData().catch(() => undefined);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "فایلی انتخاب نشده است." }, { status: 422 });
  try { return Response.json(await replaceKnowledgeSource(sourceId, file)); }
  catch (error) {
    if (error instanceof SourceError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "جایگزینی منبع در دسترس نیست." }, { status: 503 });
  }
}
export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) return Response.json({ error: "دسترسی ادمین لازم است." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const { sourceId } = await context.params;
  try { await deleteKnowledgeSource(sourceId); return new Response(null, { status: 204 }); }
  catch (error) {
    if (error instanceof SourceError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "حذف منبع در دسترس نیست." }, { status: 503 });
  }
}
