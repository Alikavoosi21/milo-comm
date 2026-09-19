import { describe, expect, it, vi } from "vitest";
import { createConversation } from "@/lib/db/repositories";
import { conversationPatchSchema } from "@/lib/validation/chat";

const OWNER = "00000000-0000-4000-8000-000000000001";
vi.mock("@/lib/auth/require-owner", () => ({ requireOwner: async () => OWNER }));

import { DELETE, PATCH } from "@/app/api/conversations/[conversationId]/route";

const contextFor = (conversationId: string) => ({ params: Promise.resolve({ conversationId }) });
const patchRequest = (body: unknown) => new Request("http://local/api/conversations/id", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("conversation management contract", () => {
  it("accepts a trimmed title and positive revision", () => {
    const parsed = conversationPatchSchema.parse({ title: "  برنامه درس  ", expectedRevision: 2 });
    expect(parsed.title).toBe("برنامه درس");
  });

  it("rejects blank and longer-than-80 titles", () => {
    expect(conversationPatchSchema.safeParse({ title: "   ", expectedRevision: 1 }).success).toBe(false);
    expect(conversationPatchSchema.safeParse({ title: "ا".repeat(81), expectedRevision: 1 }).success).toBe(false);
  });

  it("allows duplicate names at the validation boundary", () => {
    expect(conversationPatchSchema.safeParse({ title: "نام یکسان", expectedRevision: 1 }).success).toBe(true);
  });

  it("requires a mutation and rejects unknown fields", () => {
    expect(conversationPatchSchema.safeParse({ expectedRevision: 1 }).success).toBe(false);
    expect(conversationPatchSchema.safeParse({ title: "معتبر", expectedRevision: 1, ownerId: "other" }).success).toBe(false);
  });

  it("returns 200 for PATCH, 409 for stale revision, 422 for invalid input and 404 without ownership", async () => {
    const conversation = createConversation(OWNER);
    const updated = await PATCH(patchRequest({ title: "نام تازه", expectedRevision: conversation.revision }), contextFor(conversation.id));
    expect(updated.status).toBe(200);
    const conflict = await PATCH(patchRequest({ title: "نسخه قدیمی", expectedRevision: 1 }), contextFor(conversation.id));
    expect(conflict.status).toBe(409);
    const invalid = await PATCH(patchRequest({ title: " ".repeat(2), expectedRevision: conversation.revision }), contextFor(conversation.id));
    expect(invalid.status).toBe(422);
    const foreign = createConversation("foreign-owner");
    expect((await PATCH(patchRequest({ title: "نه", expectedRevision: foreign.revision }), contextFor(foreign.id))).status).toBe(404);
  });

  it("returns 204 after permanent deletion and 404 for missing or repeated deletion", async () => {
    const conversation = createConversation(OWNER);
    expect((await DELETE(new Request("http://local"), contextFor(conversation.id))).status).toBe(204);
    expect((await DELETE(new Request("http://local"), contextFor(conversation.id))).status).toBe(404);
    expect((await DELETE(new Request("http://local"), contextFor(crypto.randomUUID()))).status).toBe(404);
  });
});
