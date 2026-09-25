export function persianError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (text.includes("WEB_SEARCH")) return "جست‌وجوی وب انجام نشد. اتصال یا تنظیمات سرویس جست‌وجو را بررسی کنید.";
  if (text.includes("401") || text.includes("API key")) return "اتصال به مدل تأیید نشد. تنظیمات سرویس را بررسی کنید.";
  if (text.includes("429")) return "ظرفیت سرویس موقتاً تکمیل است. کمی بعد دوباره تلاش کنید.";
  if (text.includes("timeout")) return "پاسخ مدل بیش از حد طول کشید. دوباره تلاش کنید.";
  return "دریافت پاسخ کامل نشد. متن شما حفظ شده است و می‌توانید دوباره تلاش کنید.";
}
