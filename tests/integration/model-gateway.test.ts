import { describe, expect, it } from "vitest";
import { OpenAICompatibleGateway, type ProviderTransport } from "@/lib/model/openai-compatible";
import { persianError } from "@/lib/chat/errors";

const base = {
  baseURL: "https://provider.example/v1",
  apiKey: "sk-test-secret",
  model: "provider-model",
  timeoutMs: 50,
  mock: false,
};

describe("provider adapter contract", () => {
  it("uses configured endpoint/model without exposing auth and streams Persian UTF-8", async () => {
    let receivedModel = "";
    const transport: ProviderTransport = async function* (_messages, model) {
      receivedModel = model;
      yield "سلام";
    };
    const gateway = new OpenAICompatibleGateway(base, transport);
    let output = "";
    for await (const part of gateway.stream([{ role: "user", content: "سلام" }])) output += part;
    expect(output).toBe("سلام");
    expect(receivedModel).toBe("provider-model");
    expect(gateway.safeConfiguration()).toEqual({
      baseURL: base.baseURL,
      model: base.model,
      timeoutMs: 50,
      hasApiKey: true,
    });
    expect(JSON.stringify(gateway.safeConfiguration())).not.toContain(base.apiKey);
  });

  it.each([
    [{ status: 401 }, "تأیید نشد"],
    [{ status: 429 }, "ظرفیت"],
    [new Error("malformed stream"), "کامل نشد"],
  ])("maps provider failure %o to a safe Persian message", async (failure, expected) => {
    const transport: ProviderTransport = async function* () {
      throw failure;
    };
    const gateway = new OpenAICompatibleGateway(base, transport);
    let caught: unknown;
    try {
      for await (const part of gateway.stream([{ role: "user", content: "x" }])) { void part; }
    } catch (error) {
      caught = error;
    }
    expect(persianError(caught)).toContain(expected);
    expect(persianError(caught)).not.toContain(base.apiKey);
  });

  it("enforces timeout and respects caller cancellation", async () => {
    const transport: ProviderTransport = async function* (_messages, _model, signal) {
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
      yield "never";
    };
    const gateway = new OpenAICompatibleGateway(base, transport);
    let timeout: unknown;
    try {
      for await (const part of gateway.stream([{ role: "user", content: "x" }])) { void part; }
    } catch (error) {
      timeout = error;
    }
    expect(persianError(timeout)).toContain("طول کشید");

    const controller = new AbortController();
    controller.abort();
    const cancelledGateway = new OpenAICompatibleGateway({ ...base, mock: true });
    const chunks: string[] = [];
    for await (const part of cancelledGateway.stream([{ role: "user", content: "x" }], controller.signal)) chunks.push(part);
    expect(chunks).toEqual([]);
  });
});

