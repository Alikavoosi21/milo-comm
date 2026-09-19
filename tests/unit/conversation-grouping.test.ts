import { describe, expect, it } from "vitest";
import { groupConversations } from "@/lib/chat/conversation-list-service";
import type { Conversation } from "@/lib/types";

const conversation = (id: string, date: Date): Conversation => ({
  id,
  ownerId: "o",
  title: id,
  instructions: "",
  revision: 1,
  updatedAt: date.toISOString(),
  lifecycleState: "active",
  activeBranchId: "b",
  createdAt: date.toISOString(),
  lastActivityAt: date.toISOString(),
  branches: [],
  messages: [],
});

describe("groupConversations", () => {
  it("groups Persian labels correctly at local midnight boundaries", () => {
    const now = new Date(2026, 8, 18, 0, 5);
    const grouped = groupConversations([
      conversation("today", new Date(2026, 8, 18, 0, 0)),
      conversation("yesterday", new Date(2026, 8, 17, 23, 59, 59)),
      conversation("older", new Date(2026, 8, 16, 23, 59, 59)),
    ], now);
    expect(grouped["امروز"].map((item) => item.id)).toEqual(["today"]);
    expect(grouped["دیروز"].map((item) => item.id)).toEqual(["yesterday"]);
    expect(grouped["قدیمی‌تر"].map((item) => item.id)).toEqual(["older"]);
  });
});
