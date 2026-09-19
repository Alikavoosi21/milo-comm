"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const prompts = [
  ["خلاصه‌سازی متن", "متن یا فایل خود را بدهید تا نکات مهم را پیدا کنم."],
  ["نوشتن خلاق", "برای ایده‌پردازی، داستان و محتوای فارسی همراهتان هستم."],
  ["پاسخ به پرسش‌ها", "پرسش خود را بپرسید و پاسخ روشن و مرحله‌ای بگیرید."],
];

export default function HomePage() {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function create() { setBusy(true); const value = await fetch("/api/conversations", { method: "POST" }).then((r) => r.json()); router.push(`/chat/${value.id}`); }
  return <main className="welcome-main"><div className="welcome-content"><div className="hero-mark">م</div><span className="eyebrow">دستیار فارسی و آگاه به گفتگو</span><h1>بیایید یک گفتگوی هوشمند را شروع کنیم</h1><p>مایلو گفتگو را به خاطر می‌سپارد، فایل‌ها را می‌خواند و فقط از چت‌هایی استفاده می‌کند که خودتان انتخاب کرده‌اید.</p><button className="welcome-cta" onClick={create} disabled={busy}>{busy ? "در حال ساخت گفتگو…" : "شروع گفتگوی جدید ←"}</button><div className="prompt-grid">{prompts.map(([title, description]) => <article key={title}><span>✦</span><strong>{title}</strong><p>{description}</p></article>)}</div></div></main>;
}
