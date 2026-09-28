"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage, Conversation, ConversationMetadata } from "@/lib/types";
import { MessageList } from "./message-list";
import { ChatComposer } from "@/components/composer/chat-composer";
import { StatusLiveRegion } from "@/components/ui/status-live-region";
import { BranchSwitcher } from "./branch-switcher";
import { ConversationActions } from "./conversation-actions";
import { ConversationInstructionsDialog } from "./conversation-instructions-dialog";

const labels: Record<string, string> = {
  accepted: "در حال بررسی پیام…",
  file_reading: "در حال خواندن فایل…",
  context_ready: "در حال آماده‌سازی پاسخ…",
  generating: "در حال تولید پاسخ…",
  cancelled: "تولید پاسخ متوقف شد.",
};

interface SendInput {
  content: string;
  attachmentIds: string[];
  referenceConversationIds: string[];
  idempotencyKey: string;
}

export function ChatScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastRequest, setLastRequest] = useState<SendInput>();
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [evidenceMessageId, setEvidenceMessageId] = useState<string>();
  const controllerRef = useRef<AbortController>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  function applyConversation(value: Conversation) {
    setConversation(value);
    setMessages(value.messages.filter((message) => message.branchId === value.activeBranchId));
  }

  function applyMetadata(value: ConversationMetadata) {
    setConversation((current) => current ? { ...current, ...value } : current);
  }

  async function load() {
    const response = await fetch(`/api/conversations/${conversationId}`);
    if (response.ok) applyConversation(await response.json());
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/conversations/${conversationId}`)
      .then((response) => response.ok ? response.json() : undefined)
      .then((value: Conversation | undefined) => {
        if (active && value) applyConversation(value);
      })
      .catch(() => {});
    return () => { active = false; controllerRef.current?.abort(); };
  }, [conversationId]);

  useEffect(() => {
    const refresh = () => { void load(); };
    window.addEventListener("milo:conversations-changed", refresh);
    return () => window.removeEventListener("milo:conversations-changed", refresh);
  }, [conversationId]);

  useEffect(() => {
    if (!conversation?.id) return;
    const key = `milo:draft:${conversation.id}`;
    const draft = sessionStorage.getItem(key);
    if (!draft) return;
    sessionStorage.removeItem(key);
    void send(draft, [], []);
  }, [conversation?.id]);
  useEffect(() => {
    nearBottomRef.current = true;
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" }));
  }, [conversationId]);

  useEffect(() => {
    if (!nearBottomRef.current) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "end" });
  }, [messages, status]);

  function updateScrollPosition() {
    const element = scrollRef.current;
    if (!element) return;
    nearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 120;
  }

  async function send(content: string, attachmentIds: string[], referenceConversationIds: string[], idempotencyKey = crypto.randomUUID()) {
    const input = { content, attachmentIds, referenceConversationIds, idempotencyKey };
    setLastRequest(input);
    setBusy(true);
    setError("");
    nearBottomRef.current = true;
    const controller = new AbortController();
    controllerRef.current = controller;
    const tempUser: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId,
      branchId: conversation?.activeBranchId ?? "",
      role: "user",
      content,
      status: "completed",
      createdAt: new Date().toISOString(),
      attachmentIds,
      referenceConversationIds,
    };
    const tempAssistant: ChatMessage = {
      ...tempUser,
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      status: "streaming",
      attachmentIds: [],
      referenceConversationIds: [],
    };
    setMessages((items) => [...items, tempUser, tempAssistant]);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = await response.json();
        if (response.status === 409) setLastRequest(undefined);
        throw new Error(body.error);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const event = block.match(/^event: (.+)$/m)?.[1];
          const raw = block.match(/^data: (.+)$/m)?.[1];
          if (!event || !raw) continue;
          const data = JSON.parse(raw);
          if (event === "accepted") setLastRequest(undefined);
          if (labels[event]) {
            setStatus(event === "context_ready" && data.truncated
              ? "بخشی از زمینه به‌دلیل محدودیت حجم کوتاه شد…"
              : labels[event]);
          }
          if (event === "text_delta") {
            setMessages((items) => items.map((item) =>
              item.id === tempAssistant.id ? { ...item, content: item.content + data.text } : item));
          }
          if (event === "failed") throw new Error(data.error);
        }
      }

      setStatus("");
      await load();
      window.dispatchEvent(new Event("milo:conversations-changed"));
      return true;
    } catch (cause) {
      const cancelled = cause instanceof DOMException && cause.name === "AbortError";
      setError(cancelled ? "تولید پاسخ متوقف شد. می‌توانید دوباره تلاش کنید." : cause instanceof Error ? cause.message : "ارسال پیام کامل نشد.");
      setStatus("");
      await load();
      return false;
    } finally {
      controllerRef.current = null;
      setBusy(false);
    }
  }

  async function edit(id: string, content: string): Promise<boolean> {
    setBusy(true); setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await fetch(`/api/messages/${id}/fork?stream=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, idempotencyKey: crypto.randomUUID() }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "ویرایش پیام انجام نشد.");
      }
      if (!response.body) throw new Error("پاسخ سرور کامل نبود.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const events: { name: string; data: { error?: string } }[] = [];
      let buffer = "";
      async function nextEvent(): Promise<{ name: string; data: { error?: string } } | undefined> {
        while (!events.length) {
          const { done, value } = await reader.read();
          if (done) return undefined;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            const name = block.match(/^event: (.+)$/m)?.[1];
            const raw = block.match(/^data: (.+)$/m)?.[1];
            if (name && raw) events.push({ name, data: JSON.parse(raw) });
          }
        }
        return events.shift();
      }
      const accepted = await nextEvent();
      if (accepted?.name !== "accepted") throw new Error(accepted?.data.error || "ویرایش پیام پذیرفته نشد.");
      setStatus("در حال تولید پاسخ تازه…");
      await load();
      window.dispatchEvent(new Event("milo:conversations-changed"));
      void (async () => {
        while (true) {
          const event = await nextEvent();
          if (!event) break;
          if (event.name === "failed") throw new Error(event.data.error || "تولید پاسخ تازه انجام نشد.");
        }
        await load();
      })().catch((cause) => setError(cause instanceof Error ? cause.message : "تولید پاسخ تازه انجام نشد."))
        .finally(() => { controllerRef.current = null; setStatus(""); setBusy(false); });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ویرایش پیام انجام نشد.");
      setStatus("");
      controllerRef.current = null;
      setBusy(false);
      return false;
    }
  }

  async function selectBranch(branchId: string) {
    await fetch(`/api/conversations/${conversationId}/branches/${branchId}`, { method: "PUT" });
    await load();
  }

  const evidenceMessage = messages.find((item) => item.id === evidenceMessageId && item.citations?.length) ?? [...messages].reverse().find((item) => item.role === "assistant" && item.citations?.length);
  const citations = evidenceMessage?.citations ?? [];
  return <div className="chat-workspace"><main className="chat-main">
    <header className="chat-header">
      <div className="chat-title"><h1>{conversation?.title ?? "گفتگو"}</h1><small>پاسخ‌ها فقط از منابع مدیریت‌شده ساخته می‌شوند</small></div>
      <div className="chat-header-controls">
        <BranchSwitcher branches={conversation?.branches ?? []} activeId={conversation?.activeBranchId} onSelect={selectBranch} />
        {!!citations.length && <button type="button" className="evidence-toggle" onClick={() => setEvidenceOpen((open) => !open)} aria-expanded={evidenceOpen} aria-controls="chat-evidence-panel">{evidenceOpen ? "شواهد پاسخ" : "نمایش شواهد"}</button>}
        {conversation && <ConversationInstructionsDialog conversation={conversation} onUpdated={applyMetadata} />}
        {conversation && <ConversationActions
          conversation={conversation}
          onUpdated={applyMetadata}
          onDeleted={() => { controllerRef.current?.abort(); router.push("/"); router.refresh(); }}
        />}
      </div>
    </header>
    <section ref={scrollRef} className="chat-scroll" aria-label="پیام‌های گفتگو" onScroll={updateScrollPosition}>
      <MessageList messages={messages} onEdit={edit} disableEdit={busy} onShowEvidence={(id) => { setEvidenceMessageId(id); setEvidenceOpen(true); }} />
      {error && <div className="chat-error" role="alert">
        <span>{error}</span>
        {lastRequest && <button onClick={() => void send(lastRequest.content, lastRequest.attachmentIds, lastRequest.referenceConversationIds, lastRequest.idempotencyKey)}>تلاش دوباره</button>}
        <button aria-label="بستن خطا" onClick={() => setError("")}>×</button>
      </div>}
      <StatusLiveRegion status={status} />
      <div ref={endRef} />
    </section>
    <ChatComposer conversationId={conversationId} busy={busy} onCancel={() => controllerRef.current?.abort()} onSend={send} />
  </main>{evidenceOpen && !!citations.length && <aside id="chat-evidence-panel" className="evidence-panel" aria-label="شواهد پاسخ"><div className="evidence-panel-header"><div><h2>شواهد پاسخ</h2><p>مربوط به پاسخ انتخاب‌شده · {citations.length.toLocaleString("fa-IR")} مورد</p></div><button type="button" className="evidence-panel-close" aria-label="بستن پنل شواهد" onClick={() => setEvidenceOpen(false)}>×</button></div><div className="evidence-panel-list">{citations.map((item) => <article className="evidence-item" key={item.sourceId + ":" + item.chunkIndex}><strong>{item.sourceName}</strong><small>{item.page ? `صفحهٔ ${item.page}` : "محل دقیق ثبت نشده"}</small>{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer">بازکردن منبع ↗</a>}</article>)}</div></aside>}</div>;
}

