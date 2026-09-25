import { NextResponse } from "next/server";
import { env } from "@/lib/validation/env";
import { ADMIN_COOKIE, adminConfigured, isAdmin, newAdminToken, sameOrigin, verifyPassword } from "@/lib/auth/admin-session";

const attempts = new Map<string, { count: number; until: number }>();
export async function GET() {
  return NextResponse.json({ authenticated: await isAdmin(), configured: adminConfigured(), modelMode: env.MOCK_AI === "true" ? "demo" : "ai" });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  if (!adminConfigured()) return NextResponse.json({ error: "رمز و کلید نشست ادمین در سرور تنظیم نشده‌اند." }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const attempt = attempts.get(ip);
  if (attempt && attempt.until > now && attempt.count >= 5) {
    return NextResponse.json({ error: "تلاش‌های ورود زیاد است. کمی بعد دوباره تلاش کنید." }, { status: 429 });
  }
  let password = "";
  try { password = String((await request.json()).password || ""); } catch {}
  if (!verifyPassword(password)) {
    attempts.set(ip, { count: (attempt?.until ?? 0) > now ? attempt!.count + 1 : 1, until: now + 15 * 60 * 1000 });
    return NextResponse.json({ error: "رمز عبور نادرست است." }, { status: 401 });
  }
  attempts.delete(ip);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(ADMIN_COOKIE, newAdminToken(), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 8 * 60 * 60,
  });
  return response;
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}

