import { beforeEach, describe, expect, it } from "vitest";
import { env } from "@/lib/validation/env";
import { listUsage, recordUsage } from "@/lib/observability/usage";

type LocalState = { sources: unknown[]; chunks: unknown[]; usage: unknown[] };
beforeEach(() => {
  (globalThis as typeof globalThis & { __miloRagLocal?: LocalState }).__miloRagLocal = {
    sources: [], chunks: [], usage: [],
  };
});
describe("privacy-safe usage report", () => {
  it("keeps model counts without storing message, source or credential text", async () => {
    const requestId = crypto.randomUUID();
    const event = await recordUsage({
      requestId, operation: "answer", modelName: "demo-model", providerName: "local",
      inputTokens: 14, outputTokens: 5, estimated: true,
      durationMs: 12, status: "completed", errorCategory: null,
    });
    expect(event.costAmount).toBeNull();
    const payload = JSON.stringify(await listUsage());
    expect(payload).toContain("demo-model");
    expect(payload).not.toContain("secret-password");
    expect(payload).not.toContain("raw-document-content");
    expect(payload).not.toContain("user-message-text");
  });
  it("uses configured rates and leaves cost unknown without them", async () => {
    const originalInput = env.AI_INPUT_COST_PER_MILLION;
    const originalOutput = env.AI_OUTPUT_COST_PER_MILLION;
    env.AI_INPUT_COST_PER_MILLION = 2;
    env.AI_OUTPUT_COST_PER_MILLION = 4;
    try {
      const event = await recordUsage({
        requestId: crypto.randomUUID(), operation: "answer", modelName: "priced",
        providerName: "local", inputTokens: 1_000_000, outputTokens: 1_000_000,
        estimated: false, durationMs: 1, status: "completed", errorCategory: null,
      });
      expect(event.costAmount).toBe(6);
    } finally {
      env.AI_INPUT_COST_PER_MILLION = originalInput;
      env.AI_OUTPUT_COST_PER_MILLION = originalOutput;
    }
  });
});
