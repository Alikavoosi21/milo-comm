import { beforeEach, describe, expect, it } from "vitest";
import { appendMessage, createConversation, store } from "@/lib/db/repositories";
import { snapshotReferences } from "@/lib/chat/reference-service";

describe("reference snapshots", () => {
  beforeEach(() => { store.conversations.clear(); store.snapshots.clear(); });
  it("includes owned selected chats and excludes foreign chats", () => {
    const owned = createConversation("owner"); appendMessage(owned, { role: "user", content: "راز مجاز", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    const foreign = createConversation("other"); appendMessage(foreign, { role: "user", content: "راز خارجی", status: "completed", attachmentIds: [], referenceConversationIds: [] });
    const sources = snapshotReferences("owner", "message", [owned.id, foreign.id]);
    expect(sources).toHaveLength(1); expect(sources[0].content).toContain("راز مجاز"); expect(sources[0].content).not.toContain("راز خارجی");
  });
});
