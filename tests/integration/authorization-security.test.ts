import { beforeEach, describe, expect, it } from "vitest";
import { createConversation, getConversation, store } from "@/lib/db/repositories";
import { redact } from "@/lib/observability/logger";

describe("authorization and redaction", () => {
  beforeEach(() => store.conversations.clear());
  it("blocks cross-owner reads and redacts provider keys", () => { const conversation = createConversation("alice"); expect(getConversation("bob", conversation.id)).toBeUndefined(); expect(redact("Bearer sk-supersecret")).not.toContain("supersecret"); });
});
