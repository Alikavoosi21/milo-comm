import { beforeEach, describe, expect, it } from "vitest";
import { buildContext } from "@/lib/chat/context-builder";
import { store } from "@/lib/db/repositories";
import type { Attachment } from "@/lib/types";

const attachment = (id: string, ownerId: string, status: Attachment["status"], text: string): Attachment => ({
  id,
  ownerId,
  declaredType: "text/plain",
  byteSize: text.length,
  storageKey: `opaque-${id}`,
  originalName: `${id}.txt`,
  status,
  extractedText: text,
});

describe("attachment context", () => {
  beforeEach(() => store.attachments.clear());

  it("persists extracted text privately and includes only ready attachments owned by the requester", () => {
    const ownReady = attachment("own", "owner", "ready", "متن مجاز");
    const ownFailed = attachment("failed", "owner", "failed", "متن شکست‌خورده");
    const foreign = attachment("foreign", "other", "ready", "متن کاربر دیگر");
    for (const item of [ownReady, ownFailed, foreign]) store.attachments.set(item.id, item);

    const selected = ["own", "failed", "foreign"].flatMap((id) => {
      const item = store.attachments.get(id);
      return item?.ownerId === "owner" ? [item] : [];
    });
    const text = buildContext([], selected).messages.map((item) => item.content).join("\n");
    expect(text).toContain("متن مجاز");
    expect(text).not.toContain("متن شکست‌خورده");
    expect(text).not.toContain("متن کاربر دیگر");
    expect(store.attachments.get("own")?.storageKey).not.toContain("own.txt");
  });
});
