"use client";

import { useEffect, useRef, useState } from "react";

type PublicSource = { id: string; name: string };

export function AttachmentPicker({ onUploaded, onError, onUploadingChange, disabled }: { onUploaded(value: { id: string; originalName: string }): void; onError(message: string): void; onUploadingChange?(uploading: boolean): void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const control = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<PublicSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [sourceError, setSourceError] = useState("");

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: PointerEvent) {
      if (!control.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function showSources() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    setSourceError("");
    try {
      const response = await fetch("/api/sources", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const body: { sources: PublicSource[] } = await response.json();
      setSources(body.sources);
    } catch {
      setSourceError("فهرست منابع فعلاً در دسترس نیست.");
    } finally {
      setLoading(false);
    }
  }

  async function select(files: FileList | null) {
    const file = files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { onError(`فایل «${file.name}» بیشتر از ۱۰ مگابایت است. فرمت‌های مجاز: PDF، DOCX، TXT، MD و CSV.`); return; }
    onUploadingChange?.(true);
    const form = new FormData(); form.set("file", file);
    try {
      const response = await fetch("/api/attachments", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) { onError(`فایل «${file.name}» پذیرفته نشد: ${body.error} فرمت‌های مجاز: ${body.accepted}`); return; }
      onUploaded(body);
      setOpen(false);
      if (input.current) input.current.value = "";
    } catch {
      onError(`بارگذاری فایل «${file.name}» انجام نشد. دوباره تلاش کنید.`);
    } finally {
      onUploadingChange?.(false);
    }
  }

  return <div className="attachment-control" ref={control}>
    <button type="button" className="composer-tool" title="منابع و افزودن فایل" aria-label="نمایش منابع و افزودن فایل" aria-expanded={open} aria-controls="composer-source-popover" onClick={() => void showSources()}><span aria-hidden="true">＋</span><span>پیوست و منابع</span></button>
    {open && <div id="composer-source-popover" className="source-popover" role="dialog" aria-label="منابع دانش">
      <strong>منابع دانش</strong>
      <small>پاسخ‌های محتوایی فقط بر اساس این منابع ساخته می‌شوند.</small>
      {loading ? <p className="source-popover-state">در حال خواندن منابع…</p>
        : sourceError ? <p className="source-popover-state" role="alert">{sourceError}</p>
        : sources.length ? <ul>{sources.map((source) => <li key={source.id}><span aria-hidden="true">◫</span><span title={source.name}>{source.name}</span></li>)}</ul>
        : <p className="source-popover-state">هنوز منبع دانشی ثبت نشده است.</p>}
      <button type="button" className="source-popover-attach" disabled={disabled} onClick={() => input.current?.click()}>＋ پیوست فایل به پیام</button>
      <small>PDF، DOCX، TXT، MD، CSV · حداکثر ۱۰ مگابایت</small>
    </div>}
    <input ref={input} hidden type="file" accept=".pdf,.docx,.txt,.md,.csv" onChange={(event) => void select(event.target.files)} />
  </div>;
}
