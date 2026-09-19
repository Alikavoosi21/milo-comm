"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Conversation, ConversationMetadata } from "@/lib/types";

export function ConversationInstructionsDialog({ conversation, onUpdated }: { conversation: Conversation; onUpdated(value: ConversationMetadata): void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(conversation.instructions);
  const [saved, setSaved] = useState(conversation.instructions);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const helpId = useId();
  const dirty = draft !== saved;


  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      queueMicrotask(() => editorRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function requestClose() {
    if (dirty && !window.confirm("تغییرات ذخیره نشده‌اند. بدون ذخیره خارج می‌شوید؟")) return;
    setDraft(saved);
    setStatus("");
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  async function save() {
    setPending(true);
    setStatus("در حال ذخیره قواعد…");
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: draft, expectedRevision: conversation.revision }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSaved(body.conversation.instructions);
      setDraft(body.conversation.instructions);
      onUpdated(body.conversation);
      setStatus("قواعد گفتگو ذخیره شد");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "ذخیره قواعد انجام نشد؛ متن شما حفظ شده است.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <button ref={triggerRef} className="instructions-trigger" type="button" onClick={() => { setDraft(conversation.instructions); setSaved(conversation.instructions); setStatus(""); setOpen(true); }}>راهنمای این گفتگو</button>
    <dialog ref={dialogRef} className="instructions-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); requestClose(); }}>
      <h2 id={titleId}>راهنمای این گفتگو</h2>
      <p id={helpId}>هدف، لحن و محدودیت‌های پاسخ را بنویسید. قواعد ایمنی و حریم خصوصی همیشه اولویت بالاتری دارند.</p>
      <label htmlFor="conversation-instructions">دستورها و قواعد این گفتگو</label>
      <textarea
        ref={editorRef}
        id="conversation-instructions"
        value={draft}
        maxLength={4000}
        aria-describedby={helpId}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="instructions-meta"><span>{(4000 - draft.length).toLocaleString("fa-IR")} نویسه باقی مانده</span><span role="status" aria-live="polite">{status}</span></div>
      <div className="dialog-actions">
        <button type="button" onClick={requestClose} disabled={pending}>انصراف</button>
        <button type="button" onClick={() => setDraft("")} disabled={pending || !draft}>پاک‌کردن قواعد</button>
        <button className="primary-button" type="button" onClick={() => void save()} disabled={pending || !dirty}>{pending ? "در حال ذخیره…" : "ذخیره قواعد"}</button>
      </div>
    </dialog>
  </>;
}
