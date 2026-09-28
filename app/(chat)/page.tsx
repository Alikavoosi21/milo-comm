"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrandMark } from "@/components/brand/brand-mark";

const prompts = [
  { title: "پرسش از منابع", text: "مهم‌ترین نکات منابع ثبت‌شده چیست؟" },
  { title: "خلاصه‌سازی", text: "از محتوای منابع دانش یک خلاصهٔ کوتاه تهیه کن." },
  { title: "بررسی دقیق", text: "برای پاسخ به پرسشم از کدام منبع استفاده کردی؟" },
];

export default function HomePage() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/conversations", { method: "POST" });
      if (!response.ok) throw new Error();
      const value: { id: string } = await response.json();
      if (draft.trim()) sessionStorage.setItem(`milo:draft:${value.id}`, draft.trim());
      router.push(`/chat/${value.id}`);
      router.refresh();
    } catch { setError("شروع گفتگو انجام نشد؛ دوباره تلاش کنید."); setBusy(false); }
  }

  return <main className="welcome-main home-workspace"><div className="welcome-content">
    <div className="home-identity"><BrandMark className="hero-mark" /><span>دستیار فارسی مایلو</span></div>
    <h1>از کجا شروع کنیم؟</h1>
    <p>پرسش خود را بنویسید. پاسخ‌های مستند بر اساس سیاست منابعی که مدیر تعیین کرده ساخته می‌شوند.</p>
    <div className="home-composer"><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void create(); } }} placeholder="پرسش خود را بنویسید…" aria-label="پرسش تازه" /><div><small>پیش از ارسال می‌توانید متن را ویرایش کنید.</small><Button type="button" onClick={() => void create()} disabled={busy}><ArrowUp size={16} aria-hidden="true" />{busy ? "در حال شروع…" : "شروع گفتگو"}</Button></div></div>
    {error && <p role="alert" className="chat-error">{error}</p>}
    <div className="home-suggestions" aria-label="پیشنهادهای شروع">{prompts.map((item) => <button key={item.title} type="button" onClick={() => setDraft(item.text)}><Sparkles size={16} aria-hidden="true" /><strong>{item.title}</strong><span>{item.text}</span></button>)}</div>
  </div></main>;
}
