"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const prompts = [
  ["خلاصهٔ منابع", "دربارهٔ فایل‌های ثبت‌شدهٔ مدیر یک جمع‌بندی بخواهید."],
  ["پرسش مستند", "دربارهٔ موضوع منبع بپرسید و ارجاع پاسخ را ببینید."],
  ["دامنهٔ پاسخ", "مدیر تعیین می‌کند پاسخ از فایل‌ها، وب یا هر دو ساخته شود."],
];

export default function HomePage() {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function create() { setBusy(true); const value = await fetch("/api/conversations", { method: "POST" }).then((r) => r.json()); router.push(`/chat/${value.id}`); }
  return <main className="welcome-main"><div className="welcome-content"><div className="hero-mark">م</div><span className="eyebrow">دستیار فارسی و آگاه به گفتگو</span><h1>بیایید یک گفتگوی هوشمند را شروع کنیم</h1><p>مایلو پرسش‌ها را با سیاست انتخاب‌شدهٔ مدیر پاسخ می‌دهد. با نشانهٔ کتاب در چت می‌توانید منابع فعال را ببینید.</p><button className="welcome-cta" onClick={create} disabled={busy}>{busy ? "در حال ساخت گفتگو…" : "شروع گفتگوی جدید ←"}</button><div className="prompt-grid">{prompts.map(([title, description]) => <article key={title}><span>✦</span><strong>{title}</strong><p>{description}</p></article>)}</div></div></main>;
}
