"use client";

import { useRef } from "react";

export function AttachmentPicker({ onUploaded, onError, disabled }: { onUploaded(value: { id: string; originalName: string }): void; onError(message: string): void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  async function select(files: FileList | null) {
    const file = files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { onError(`فایل «${file.name}» بیشتر از ۱۰ مگابایت است. فرمت‌های مجاز: PDF، DOCX، TXT، MD و CSV.`); return; }
    const form = new FormData(); form.set("file", file);
    const response = await fetch("/api/attachments", { method: "POST", body: form }); const body = await response.json();
    if (!response.ok) { onError(`فایل «${file.name}» پذیرفته نشد: ${body.error} فرمت‌های مجاز: ${body.accepted}`); return; }
    onUploaded(body); if (input.current) input.current.value = "";
  }
  return <div className="attachment-control">
    <button type="button" className="composer-tool" title="افزودن فایل" onClick={() => input.current?.click()} disabled={disabled}>⌕</button>
    <input ref={input} hidden type="file" accept=".pdf,.docx,.txt,.md,.csv" onChange={(event) => select(event.target.files)} />
    <span className="upload-help">PDF، DOCX، TXT، MD، CSV · حداکثر ۱۰MB</span>
  </div>;
}
