import { beforeEach, describe, expect, it } from "vitest";
import { appendMessage, createConversation, store } from "@/lib/db/repositories";
import { snapshotReferences } from "@/lib/chat/reference-service";
describe("conversation reference persistence", () => {
  beforeEach(() => { store.conversations.clear(); store.snapshots.clear(); });
  it("persists an immutable owned snapshot", () => { const source = createConversation("owner"); appendMessage(source, { role: "user", content: "نسخه اول", status: "completed", attachmentIds: [], referenceConversationIds: [] }); const snapshot = snapshotReferences("owner", "m1", [source.id]); appendMessage(source, { role: "user", content: "نسخه دوم", status: "completed", attachmentIds: [], referenceConversationIds: [] }); expect(store.snapshots.get("m1")).toEqual(snapshot); expect(snapshot[0].content).not.toContain("نسخه دوم"); });
});
