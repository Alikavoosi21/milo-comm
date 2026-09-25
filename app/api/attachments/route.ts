export async function POST(request: Request) {
  void request;
  return Response.json({ error: "بارگذاری فایل در چت غیرفعال است. منابع فقط از پنل مدیریت ثبت می‌شوند." }, { status: 403 });
}
