import { isAdmin, sameOrigin } from "@/lib/auth/admin-session";
import { applyRagSettings, SourceError } from "@/lib/rag/source-service";
import { getRagSettings, ragSettingsSchema } from "@/lib/rag/settings";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "دسترسی ادمین لازم است." }, { status: 401 });
  try { return Response.json({ settings: await getRagSettings() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "خواندن تنظیمات ممکن نیست." }, { status: 503 }); }
}
export async function PUT(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "دسترسی ادمین لازم است." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const body = await request.json().catch(() => undefined);
  const parsed = ragSettingsSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "مقادیر تنظیمات معتبر نیستند؛ تعداد نتیجه‌ها، اندازهٔ قطعه و هم‌پوشانی را بررسی کنید." }, { status: 422 });
  try { return Response.json(await applyRagSettings(parsed.data)); }
  catch (error) {
    if (error instanceof SourceError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "ذخیرهٔ تنظیمات انجام نشد؛ منابع قبلی فعال ماندند." }, { status: 503 });
  }
}
