"use client";

import { useState } from "react";
import { SourcePicker } from "./source-picker";
import { ConversationReferencePicker } from "./conversation-reference-picker";

interface ChatComposerProps {
  conversationId: string;
  busy: boolean;
  onSend(content: string, attachmentIds: string[], referenceIds: string[]): Promise<boolean>;
  onCancel(): void;
}

export function ChatComposer({ conversationId, busy, onSend, onCancel }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [references, setReferences] = useState<string[]>([]);

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    const ok = await onSend(value, [], references);
    if (ok) {
      setText("");
      setReferences([]);
    }
  }

  return <div className="composer-wrap">
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
          <SourcePicker />
          <ConversationReferencePicker currentId={conversationId} selected={references} onChange={setReferences} />
        </div>
        {busy
          ? <button className="send-button" onClick={onCancel} aria-label="توقف تولید پاسخ">■</button>
          : <button className="send-button" onClick={submit} disabled={!text.trim()} aria-label="ارسال پیام">↑</button>}
      </div>
    </div>
    <small className="composer-note">پاسخ‌ها با سیاست انتخاب‌شده در پنل مدیریت ساخته می‌شوند.</small>
  </div>;
}
