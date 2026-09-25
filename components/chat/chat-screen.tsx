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
}

export function ChatScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastRequest, setLastRequest] = useState<SendInput>();
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

  async function send(content: string, attachmentIds: string[], referenceConversationIds: string[]) {
    const input = { content, attachmentIds, referenceConversationIds };
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
        body: JSON.stringify({ ...input, idempotencyKey: crypto.randomUUID() }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = await response.json();
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

  async function edit(id: string, content: string) {
    setBusy(true);
    const response = await fetch(`/api/messages/${id}/fork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, idempotencyKey: crypto.randomUUID() }),
    });
    if (!response.ok) setError("ویرایش پیام انجام نشد.");
    await load();
    setBusy(false);
  }

  async function selectBranch(branchId: string) {
    await fetch(`/api/conversations/${conversationId}/branches/${branchId}`, { method: "PUT" });
    await load();
  }

  return <main className="chat-main">
    <header className="chat-header">
      <div className="chat-title"><h1>{conversation?.title ?? "گفتگو"}</h1><small>پاسخ‌ها فقط از منابع مدیریت‌شده ساخته می‌شوند</small></div>
      <div className="chat-header-controls">
        <BranchSwitcher branches={conversation?.branches ?? []} activeId={conversation?.activeBranchId} onSelect={selectBranch} />
        {conversation && <ConversationInstructionsDialog conversation={conversation} onUpdated={applyMetadata} />}
        {conversation && <ConversationActions
          conversation={conversation}
          onUpdated={applyMetadata}
          onDeleted={() => { controllerRef.current?.abort(); router.push("/"); router.refresh(); }}
        />}
      </div>
    </header>
    <section ref={scrollRef} className="chat-scroll" aria-label="پیام‌های گفتگو" onScroll={updateScrollPosition}>
      <MessageList messages={messages} onEdit={edit} />
      {error && <div className="chat-error" role="alert">
        <span>{error}</span>
        {lastRequest && <button onClick={() => void send(lastRequest.content, lastRequest.attachmentIds, lastRequest.referenceConversationIds)}>تلاش دوباره</button>}
        <button aria-label="بستن خطا" onClick={() => setError("")}>×</button>
      </div>}
      <StatusLiveRegion status={status} />
      <div ref={endRef} />
    </section>
    <ChatComposer conversationId={conversationId} busy={busy} onCancel={() => controllerRef.current?.abort()} onSend={send} />
  </main>;
}

