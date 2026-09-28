"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MessageEditor({ initial, onCancel, onSave }: { initial: string; onCancel(): void; onSave(value: string): Promise<boolean> }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (!value.trim() || busy) return;
    setBusy(true); setError("");
    try {
      if (!(await onSave(value.trim()))) setError("ذخیره یا تولید دوباره انجام نشد؛ متن شما حفظ شده است.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ذخیره انجام نشد."); }
    finally { setBusy(false); }
  }
  return <div className="message-editor" dir="rtl"><label htmlFor="edit-message">ویرایش پیام</label><Textarea id="edit-message" value={value} onChange={(event) => setValue(event.target.value)} disabled={busy} autoFocus />{error && <p role="alert" className="message-edit-error">{error}</p>}<div><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>انصراف</Button><Button type="button" className="primary-small" disabled={busy || !value.trim()} onClick={() => void save()}>{busy ? "در حال ذخیره…" : "ذخیره و تولید دوباره"}</Button></div></div>;
}
