import type { ChatMessage } from "@/lib/types";
import { MessageCard } from "./message-card";
import { BrandMark } from "@/components/brand/brand-mark";

export function MessageList({ messages, onEdit, disableEdit = false, onShowEvidence }: { messages: ChatMessage[]; onEdit(id: string, value: string): Promise<boolean>; disableEdit?: boolean; onShowEvidence?(id: string): void }) {
  if (!messages.length) return <div className="chat-empty"><BrandMark className="hero-mark" /><h1>چه کمکی از دستم برمی‌آید؟</h1><p>پرسش خود را دربارهٔ منابع ثبت‌شده بنویسید.</p></div>;
  return <div className="message-list">{messages.map((message) => <MessageCard key={message.id} message={message} onEdit={message.role === "user" ? (value) => onEdit(message.id, value) : undefined} disableEdit={disableEdit} onShowEvidence={message.role === "assistant" && message.citations?.length ? () => onShowEvidence?.(message.id) : undefined} />)}</div>;
}
