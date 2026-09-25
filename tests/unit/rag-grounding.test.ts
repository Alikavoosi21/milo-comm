import { beforeEach, describe, expect, it } from "vitest";
import { createConversation, appendMessage, store } from "@/lib/db/repositories";
import { prepareMemory } from "@/lib/memory/summary-service";
import { answerFromSources, NO_SOURCE_ANSWER } from "@/lib/rag/answer-chain";
import { splitKnowledge } from "@/lib/rag/chunking";
import { replaceLocalChunks } from "@/lib/rag/knowledge-store";

beforeEach(() => {
  store.conversations.clear();
  replaceLocalChunks([]);
  const state = globalThis as typeof globalThis & { __miloRagLocal?: { sources: unknown[]; chunks: unknown[]; usage: unknown[] } };
  if (state.__miloRagLocal) { state.__miloRagLocal.sources = []; state.__miloRagLocal.usage = []; }
});

describe("grounded RAG", () => {
  it("uses exactly 15 characters of overlap between split chunks", async () => {
    const pieces = await splitKnowledge("الف".repeat(2200), "s", "source.txt", 1);
    expect(pieces.length).toBeGreaterThan(2);
    expect(pieces[0].pageContent.slice(-15)).toBe(pieces[1].pageContent.slice(0, 15));
  });
  it("returns the fixed answer when no source is active", async () => {
    const result = await answerFromSources("چه زمانی؟", { summary: "", recent: [], summarized: false });
    expect(result).toEqual({ text: NO_SOURCE_ANSWER, citations: [] });
  });
  it("uses only current conversation messages when building memory", async () => {
    const first = createConversation("owner");
    const second = createConversation("owner");
    for (let index = 0; index < 10; index++) {
      appendMessage(first, { role: "user", content: "یادداشت " + index + " " + "الف".repeat(5500), status: "completed", attachmentIds: [], referenceConversationIds: [] });
    }
    const before = first.messages.length;
    const memory = await prepareMemory(first);
    expect(memory.summarized).toBe(true);
    expect(memory.recent).toHaveLength(8);
    expect(first.messages).toHaveLength(before);
    expect(first.summary).toBeTruthy();
    expect((await prepareMemory(second)).summary).toBe("");
  });
});
