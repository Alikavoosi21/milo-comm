/** Tiny social replies are allowed without treating them as factual source answers. */
export function socialReply(message: string): string | null {
  if (/[؟?]/u.test(message)) return null;
  const normalized = message.normalize("NFKC").toLowerCase()
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/[!！.،,؛;\s]+/gu, " ").trim();
  if (new Set(["سلام", "درود", "سلام علیکم", "سلام وقت بخیر", "صبح بخیر", "روز بخیر", "عصر بخیر", "شب بخیر", "وقت بخیر", "hello", "hi"]).has(normalized)) {
    return "سلام! خوش آمدید. پرسش‌های محتوایی را فقط بر اساس منابع ثبت‌شده پاسخ می‌دهم.";
  }
  if (new Set(["ممنون", "مرسی", "سپاس", "متشکرم", "تشکر", "ممنون از شما", "خیلی ممنون", "خسته نباشید"]).has(normalized)) {
    return "خواهش می‌کنم.";
  }
  if (new Set(["خداحافظ", "خدا حافظ", "بدرود", "فعلا", "فعلاً", "goodbye", "bye"]).has(normalized)) {
    return "خدانگهدار!";
  }
  return null;
}
