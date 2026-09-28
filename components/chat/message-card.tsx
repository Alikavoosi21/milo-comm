"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import { MessageEditor } from "./message-editor";
import { SourceCitations } from "./source-citations";

export function MessageCard({ message, onEdit, disableEdit = false, onShowEvidence }: { message: ChatMessage; onEdit?(value: string): Promise<boolean>; disableEdit?: boolean; onShowEvidence?(): void }) {
  const [editing, setEditing] = useState(false);
  if (editing && onEdit) return <MessageEditor initial={message.content} onCancel={() => setEditing(false)} onSave={async (value) => { const saved = await onEdit(value); if (saved) setEditing(false); return saved; }} />;

  return <article className={`message ${message.role}`}>
    {message.role === "user" ? <div className="avatar" aria-hidden="true">ش</div> : <BrandMark className="avatar brand-avatar" />}
    <div className="message-body">
      <strong>{message.role === "user" ? "شما" : "مایلو"}</strong>
      {message.role === "assistant" ? <div className="message-response" dir="rtl"><MessageResponse>{message.content || "…"}</MessageResponse></div> : <p>{message.content}</p>}
      {message.role === "assistant" && !!message.citations?.length && <SourceCitations items={message.citations} onShowEvidence={onShowEvidence} />}
      {message.role === "user" && !!(message.attachmentIds.length || message.referenceConversationIds.length) && <div className="reference-badges" aria-label="زمینهٔ این پیام">{message.attachmentIds.map((id) => <span key={id}>📄 فایل پیوست‌شده</span>)}{message.referenceConversationIds.map((id) => <span key={id}>＠ گفتگوی مرجع</span>)}</div>}
      <div className="message-controls">
        <Button type="button" variant="ghost" size="xs" onClick={() => void navigator.clipboard.writeText(message.content)} aria-label="کپی متن پیام"><Copy size={13} aria-hidden="true" />کپی</Button>
        {message.role === "user" && onEdit && !disableEdit && <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(true)}>ویرایش</Button>}
      </div>
    </div>
  </article>;
}
