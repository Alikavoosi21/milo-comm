"use client";

import { useEffect, useRef, useState } from "react";

type PublicSource = { id: string; name: string };
export function SourcePicker() {
  const control = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<PublicSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) { if (!control.current?.contains(event.target as Node)) setOpen(false); }
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);
  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true); setLoading(true); setError("");
    try {
      const response = await fetch("/api/sources", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const body: { sources: PublicSource[] } = await response.json();
      setSources(body.sources);
    } catch { setError("فهرست منابع فعلاً در دسترس نیست."); }
    finally { setLoading(false); }
  }
  return <div className="attachment-control" ref={control}>
    <button type="button" className="composer-tool source-picker-trigger" title="نمایش منابع دانش" aria-label="نمایش منابع دانش" aria-expanded={open} aria-controls="composer-source-popover" onClick={() => void toggle()}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5c-2.5-1.5-5.6-1.8-9-1v13c3.4-.8 6.5-.5 9 1 2.5-1.5 5.6-1.8 9-1v-13c-3.4-.8-6.5-.5-9 1Z"/><path d="M12 6.5v13"/></svg>
    </button>
    {open && <div id="composer-source-popover" className="source-popover" role="dialog" aria-label="منابع دانش">
      <strong>منابع دانش</strong><small>فایل‌ها فقط توسط مدیر ثبت می‌شوند.</small>
      {loading ? <p className="source-popover-state">در حال خواندن منابع…</p>
        : error ? <p className="source-popover-state" role="alert">{error}</p>
        : sources.length ? <ul>{sources.map((source) => <li key={source.id}><span aria-hidden="true">◫</span><span title={source.name}>{source.name}</span></li>)}</ul>
        : <p className="source-popover-state">هنوز منبعی ثبت نشده است.</p>}
    </div>}
  </div>;
}
