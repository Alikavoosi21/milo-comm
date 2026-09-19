"use client";

import { useEffect, useState } from "react";
import type { Conversation } from "@/lib/types";

export function ConversationReferencePicker({ currentId, selected, onChange }: { currentId: string; selected: string[]; onChange(ids: string[]): void }) {
  const [open, setOpen] = useState(false); const [items, setItems] = useState<Conversation[]>([]);
  useEffect(() => { if (open) fetch("/api/conversations").then((r) => r.json()).then(setItems); }, [open]);
  return <div className="reference-picker">
    <button type="button" className="composer-tool" title="ارجاع به گفتگوی دیگر" onClick={() => setOpen((value) => !value)}>＠</button>
    {open && <div className="reference-popover"><strong>ارجاع به گفتگو</strong><small>فقط گفتگوهای انتخاب‌شده برای مدل خوانده می‌شوند.</small>{items.filter((item) => item.id !== currentId).map((item) => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />{item.title}</label>)}</div>}
  </div>;
}
