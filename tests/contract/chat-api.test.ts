import { describe, expect, it } from "vitest";
import { messageInputSchema } from "@/lib/validation/chat";
import { encodeEvent } from "@/lib/model/stream-events";

describe("chat API contract", () => {
  it("accepts the documented message payload", () => expect(messageInputSchema.safeParse({ content: "سلام", idempotencyKey: "12345678" }).success).toBe(true));
  it("encodes named SSE events", () => expect(new TextDecoder().decode(encodeEvent({ type: "generating" }))).toContain("event: generating"));
});
