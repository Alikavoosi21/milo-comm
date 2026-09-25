import { beforeEach, describe, expect, it } from "vitest";
import { createKnowledgeSource, deleteKnowledgeSource, replaceKnowledgeSource } from "@/lib/rag/source-service";
import { answerFromSources, NO_SOURCE_ANSWER } from "@/lib/rag/answer-chain";
import { listSources } from "@/lib/rag/knowledge-store";
import { listUsage } from "@/lib/observability/usage";

type LocalState = { sources: unknown[]; chunks: unknown[]; usage: unknown[] };
function clean() {
  (globalThis as typeof globalThis & { __miloRagLocal?: LocalState }).__miloRagLocal = {
    sources: [], chunks: [], usage: [],
  };
}
function file(name: string, text: string) { return new File([text], name, { type: "text/plain" }); }
const memory = { summary: "", recent: [], summarized: false };

beforeEach(clean);

describe("knowledge source workflow", () => {
  it("indexes a source, grounds an answer, and removes its evidence", async () => {
    const source = await createKnowledgeSource(file("pricing.txt", "قیمت محصول برابر پنجاه تومان است و در پایان ماه پرداخت می‌شود."));
    try {
      expect(source?.status).toBe("ready");
      const answer = await answerFromSources("قیمت محصول چقدر است؟", memory);
      expect(answer.text).toContain("پنجاه تومان");
      expect(answer.citations).toEqual([{ sourceId: source?.id, sourceName: "pricing.txt", chunkIndex: 0 }]);
      expect((await listUsage()).some((event) => event.operation === "embed")).toBe(true);
    } finally { if (source) await deleteKnowledgeSource(source.id); }
    expect((await answerFromSources("قیمت محصول چقدر است؟", memory)).text).toBe(NO_SOURCE_ANSWER);
  });

  it("rejects a fourth source and preserves the active version on invalid replacement", async () => {
    const created = [];
    try {
      for (let index = 0; index < 3; index++) {
        const source = await createKnowledgeSource(file("source" + index + ".txt", "پاسخ معتبر شمارهٔ " + index));
        if (source) created.push(source);
      }
      expect(created).toHaveLength(3);
      await expect(createKnowledgeSource(file("fourth.txt", "متن چهارم"))).rejects.toMatchObject({ status: 409 });
      await expect(replaceKnowledgeSource(created[0].id, file("empty.txt", ""))).rejects.toMatchObject({ status: 422 });
      expect((await listSources())[0].activeVersion).toBe(1);
    } finally { for (const source of created) await deleteKnowledgeSource(source.id); }
  });
});
