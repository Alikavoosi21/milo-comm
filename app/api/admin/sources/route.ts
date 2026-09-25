import { isAdmin, sameOrigin } from "@/lib/auth/admin-session";
import { createKnowledgeSource, SourceError } from "@/lib/rag/source-service";
import { listSources } from "@/lib/rag/knowledge-store";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "دسترسی ادمین لازم است." }, { status: 401 });
  try { return Response.json({ sources: await listSources(), limit: 3 }); }
  catch { return Response.json({ error: "خواندن منابع ممکن نیست." }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "دسترسی ادمین لازم است." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const form = await request.formData().catch(() => undefined);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "فایلی انتخاب نشده است." }, { status: 422 });
  try {
    const source = await createKnowledgeSource(file);
    return Response.json(source, { status: 201 });
  } catch (error) {
    if (error instanceof SourceError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "آماده‌سازی منبع در دسترس نیست." }, { status: 503 });
  }
}
