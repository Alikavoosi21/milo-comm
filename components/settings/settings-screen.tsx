"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/ui/theme-provider";

export function SettingsScreen() {
  const { theme, status } = useTheme();
  return <main className="settings-main">
    <div className="settings-content">
      <header><span className="eyebrow">فضای شخصی شما</span><h1>تنظیمات</h1><p>ظاهر و تجربه کار با مایلو را به فارسی مدیریت کنید.</p></header>
      <section className="settings-card" aria-labelledby="appearance-title">
        <div><h2 id="appearance-title">ظاهر برنامه</h2><p>حالت روشن یا تاریک را انتخاب کنید. انتخاب شما برای دفعات بعد حفظ می‌شود.</p></div>
        <ThemeToggle showLabel />
        <small>حالت فعال: {theme === "light" ? "روشن" : "تاریک"}</small>
        <p className="settings-status" role="status" aria-live="polite">{status}</p>
      </section>
      <section className="settings-card" aria-labelledby="assistant-title">
        <div><h2 id="assistant-title">دستیار هوش مصنوعی</h2><p>پاسخ‌ها توسط مدل تنظیم‌شده برای MILO COMM تولید می‌شوند. نام مدل و سرویس، اصطلاح فنی محسوب می‌شوند.</p></div>
        <p>حافظهٔ کوتاه‌مدت، پیام‌های همین گفتگو را برای فهم پرسش‌های پیگیری نگه می‌دارد. در گفتگوهای طولانی، بخش قدیمی‌تر خلاصه می‌شود؛ گفتگوهای دیگر وارد این حافظه نمی‌شوند.</p>
      </section>
    </div>
  </main>;
}
