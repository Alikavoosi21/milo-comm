import { describe, expect, it } from "vitest";
import { conversationPatchSchema } from "@/lib/validation/chat";

describe("conversation instructions contract", () => {
  it("accepts save and clear at the 4000 character boundary", () => {
    expect(conversationPatchSchema.safeParse({ instructions: "ا".repeat(4000), expectedRevision: 1 }).success).toBe(true);
    expect(conversationPatchSchema.safeParse({ instructions: "", expectedRevision: 2 }).success).toBe(true);
  });

  it("rejects 4001 characters, invalid revisions and extra fields", () => {
    expect(conversationPatchSchema.safeParse({ instructions: "ا".repeat(4001), expectedRevision: 1 }).success).toBe(false);
    expect(conversationPatchSchema.safeParse({ instructions: "قاعده", expectedRevision: 0 }).success).toBe(false);
    expect(conversationPatchSchema.safeParse({ instructions: "قاعده", expectedRevision: 1, unsafe: true }).success).toBe(false);
  });
});
