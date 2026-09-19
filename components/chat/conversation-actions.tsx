"use client";

import { useEffect, useRef, useState } from "react";
import type { Conversation, ConversationMetadata } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ConversationActions({
  conversation,
  onUpdated,
  onDeleted,
}: {
  conversation: Conversation;
  onUpdated(value: ConversationMetadata): void;
  onDeleted(): void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) queueMicrotask(() => titleRef.current?.select()); }, [editing]);

  async function rename() {
    const title = draft.trim();
    if (!title || title.length > 80) {
      setError(title ? "نام گفتگو حداکثر می‌تواند ۸۰ نویسه باشد." : "نام گفتگو نمی‌تواند خالی باشد.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, expectedRevision: conversation.revision }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      onUpdated(body.conversation);
      window.dispatchEvent(new Event("milo:conversations-changed"));
      setEditing(false);
      setMenuOpen(false);
      queueMicrotask(() => triggerRef.current?.focus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تغییر نام انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error);
      }
      window.dispatchEvent(new Event("milo:conversations-changed"));
      setDeleteOpen(false);
      onDeleted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حذف گفتگو انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  function cancelRename() {
    setDraft(conversation.title);
    setError("");
    setEditing(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  return <div className="conversation-actions">
    <button ref={triggerRef} className="icon-button" type="button" aria-label="عملیات گفتگو" aria-expanded={menuOpen} onClick={() => { setMenuOpen((value) => !value); setEditing(false); setError(""); }}>•••</button>
    {menuOpen && <div className="conversation-menu" role="menu">
      {!editing ? <>
        <button type="button" role="menuitem" onClick={() => { setDraft(conversation.title); setEditing(true); }}>تغییر نام</button>
        <button type="button" role="menuitem" className="danger-text" onClick={() => { setDeleteOpen(true); setMenuOpen(false); }}>حذف گفتگو</button>
      </> : <div className="rename-editor">
        <label htmlFor="conversation-title">نام گفتگو</label>
        <input
          ref={titleRef}
          id="conversation-title"
          value={draft}
          maxLength={80}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); void rename(); }
            if (event.key === "Escape") cancelRename();
          }}
          disabled={pending}
        />
        <small>{draft.length} از ۸۰</small>
        {error && <span role="alert">{error}</span>}
        <div><button type="button" onClick={cancelRename}>لغو</button><button type="button" onClick={() => void rename()} disabled={pending}>{pending ? "در حال ذخیره…" : "ذخیره"}</button></div>
      </div>}
    </div>}
    <ConfirmDialog
      open={deleteOpen}
      title="حذف گفتگو"
      description={`گفتگوی «${conversation.title}» برای همیشه حذف می‌شود. این حذف دائمی است و قابل بازگشت نیست.`}
      confirmLabel="حذف دائمی"
      pending={pending}
      error={error}
      onCancel={() => { setDeleteOpen(false); setError(""); queueMicrotask(() => triggerRef.current?.focus()); }}
      onConfirm={() => void remove()}
    />
  </div>;
}
