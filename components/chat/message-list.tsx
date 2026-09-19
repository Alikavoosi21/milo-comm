import type { ChatMessage } from "@/lib/types";
import { MessageCard } from "./message-card";

export function MessageList({ messages, onEdit }: { messages: ChatMessage[]; onEdit(id: string, value: string): Promise<void> }) {
  if (!messages.length) return <div className="chat-empty"><div className="hero-mark">م</div><h1>چه کمکی از دستم برمی‌آید؟</h1><p>پرسش کنید، فایل بدهید یا به یکی از گفتگوهای قبلی ارجاع دهید.</p></div>;
  return <div className="message-list">{messages.map((message) => <MessageCard key={message.id} message={message} onEdit={message.role === "user" ? (value) => onEdit(message.id, value) : undefined} />)}</div>;
}
