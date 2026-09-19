export type StreamEventType = "accepted" | "file_reading" | "context_ready" | "generating" | "text_delta" | "completed" | "failed" | "cancelled";
export interface StreamEvent { type: StreamEventType; text?: string; messageId?: string; error?: string; truncated?: boolean }

export function encodeEvent(event: StreamEvent) {
  return new TextEncoder().encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}
