"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageEditor } from "./message-editor";
import { SourceCitations } from "./source-citations";

export function MessageCard({ message, onEdit }: { message: ChatMessage; onEdit?(value: string): Promise<void> }) {
  const [editing, setEditing] = useState(false);
  if (editing && onEdit) {
    return <MessageEditor initial={message.content} onCancel={() => setEditing(false)} onSave={async (value) => {
      await onEdit(value);
      setEditing(false);
    }} />;
  }

  return <article className={`message ${message.role}`}>
    <div className="avatar">{message.role === "user" ? "ش" : "م"}</div>
    <div className="message-body">
      <strong>{message.role === "user" ? "شما" : "مایلو"}</strong>
      <p>{message.content || "…"}</p>
      {message.role === "assistant" && !!message.citations?.length && <SourceCitations items={message.citations} />}
      {message.role === "user" && !!(message.attachmentIds.length || message.referenceConversationIds.length) &&
        <div className="reference-badges" aria-label="منابع این پیام">
          {message.attachmentIds.map((id) => <span key={id}>📄 فایل پیوست‌شده</span>)}
          {message.referenceConversationIds.map((id) => <span key={id}>＠ گفتگوی مرجع</span>)}
        </div>}
      {message.role === "user" && onEdit && <button className="edit-button" onClick={() => setEditing(true)}>ویرایش</button>}
    </div>
  </article>;
}

