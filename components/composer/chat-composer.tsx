"use client";

import { useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentPicker } from "./attachment-picker";
import { AttachmentList } from "./attachment-list";
import { ConversationReferencePicker } from "./conversation-reference-picker";

interface ChatComposerProps {
  conversationId: string;
  busy: boolean;
  onSend(content: string, attachmentIds: string[], referenceIds: string[]): Promise<boolean>;
  onCancel(): void;
}
type Uploaded = { id: string; originalName: string };

export function ChatComposer({ conversationId, busy, onSend, onCancel }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [references, setReferences] = useState<string[]>([]);
  const [referenceNames, setReferenceNames] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Uploaded[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function submit() {
    const value = text.trim();
    if (!value || busy || uploading) return;
    const ok = await onSend(value, attachments.map((item) => item.id), references);
    if (ok) { setText(""); setReferences([]); setAttachments([]); setAttachmentError(""); }
  }

  return <div className="composer-wrap">
    <AttachmentList items={attachments} error={attachmentError} onRemove={(id) => setAttachments((items) => items.filter((item) => item.id !== id))} />
    {!!references.length && <div className="reference-badges">{references.map((id) => <span key={id}>＠ {referenceNames[id] ?? "گفتگوی مرجع"} <button type="button" onClick={() => setReferences(references.filter((item) => item !== id))} aria-label={`حذف ${referenceNames[id] ?? "گفتگوی مرجع"}`}>×</button></span>)}</div>}
    <div className="composer-box">
      <Textarea className="composer-input" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }} placeholder="پیامتان را بنویسید…" aria-label="متن پیام" />
      <div className="composer-actions"><div className="composer-tools">
        <AttachmentPicker onUploaded={(value) => { setAttachments((items) => [...items, value]); setAttachmentError(""); }} onError={setAttachmentError} onUploadingChange={setUploading} disabled={busy || uploading} />
        <ConversationReferencePicker currentId={conversationId} selected={references} onChange={setReferences} onNames={setReferenceNames} />
        {uploading && <small role="status">در حال بارگذاری فایل…</small>}
      </div>{busy ? <Button type="button" variant="outline" className="stop-button" onClick={onCancel} aria-label="توقف تولید پاسخ"><Square size={13} aria-hidden="true" />توقف</Button> : <Button type="button" className="send-button" onClick={() => void submit()} disabled={!text.trim() || uploading} aria-label="ارسال پیام"><ArrowUp size={17} aria-hidden="true" /></Button>}</div>
    </div><small className="composer-note">Enter: ارسال · Shift+Enter: خط جدید</small>
  </div>;
}
