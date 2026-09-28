"use client";

import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@/lib/types";

interface ConversationReferencePickerProps {
  currentId: string;
  selected: string[];
  onChange(ids: string[]): void;
  onNames(names: Record<string, string>): void;
}

export function ConversationReferencePicker({ currentId, selected, onChange, onNames }: ConversationReferencePickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/conversations", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("گفت‌وگوها بارگذاری نشدند.");
        return response.json() as Promise<Conversation[]>;
      })
      .then((value) => {
        setItems(value);
        onNames(Object.fromEntries(value.map((item) => [item.id, item.title])));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "گفت‌وگوها بارگذاری نشدند.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  const available = items.filter((item) => item.id !== currentId);
  return <div ref={rootRef} className="reference-picker">
    <button type="button" className="composer-tool" aria-expanded={open} aria-controls="conversation-reference-popover" onClick={() => setOpen((value) => !value)}>＠ گفتگوی مرجع</button>
    {open && <div id="conversation-reference-popover" className="reference-popover" role="dialog" aria-label="انتخاب گفتگوی مرجع">
      <strong>ارجاع به گفتگو</strong>
      <small>فقط گفتگوهای انتخاب‌شده برای مدل خوانده می‌شوند.</small>
      {loading && <p role="status">در حال بارگذاری گفتگوها…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !available.length && <p>گفتگوی دیگری برای ارجاع وجود ندارد.</p>}
      {!loading && !error && available.map((item) => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />{item.title}</label>)}
    </div>}
  </div>;
}
