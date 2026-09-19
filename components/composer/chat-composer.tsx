"use client";

import { useState } from "react";
import { AttachmentPicker } from "./attachment-picker";
import { AttachmentList } from "./attachment-list";
import { ConversationReferencePicker } from "./conversation-reference-picker";

interface ChatComposerProps {
  conversationId: string;
  busy: boolean;
  onSend(content: string, attachmentIds: string[], referenceIds: string[]): Promise<boolean>;
  onCancel(): void;
}

export function ChatComposer({ conversationId, busy, onSend, onCancel }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<{ id: string; originalName: string }[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    const ok = await onSend(value, attachments.map((item) => item.id), references);
    if (ok) {
      setText("");
      setAttachments([]);
      setReferences([]);
      setError("");
    }
  }

  return <div className="composer-wrap">
    <AttachmentList items={attachments} error={error} onRemove={(id) => setAttachments((items) => items.filter((item) => item.id !== id))} />
    {!!references.length && <div className="reference-badges">{references.map((id) =>
      <span key={id}>＠ گفتگوی انتخاب‌شده <button onClick={() => setReferences(references.filter((item) => item !== id))}>×</button></span>)}</div>}
    <div className="composer-box">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="پیامتان را بنویسید…"
        aria-label="متن پیام"
      />
      <div className="composer-actions">
        <div className="composer-tools">
          <AttachmentPicker disabled={busy} onUploaded={(item) => { setAttachments((items) => [...items, item]); setError(""); }} onError={setError} />
          <ConversationReferencePicker currentId={conversationId} selected={references} onChange={setReferences} />
        </div>
        {busy
          ? <button className="send-button" onClick={onCancel} aria-label="توقف تولید پاسخ">■</button>
          : <button className="send-button" onClick={submit} disabled={!text.trim()} aria-label="ارسال پیام">↑</button>}
      </div>
    </div>
    <small className="composer-note">مایلو ممکن است اشتباه کند؛ اطلاعات مهم را بررسی کنید.</small>
  </div>;
}
