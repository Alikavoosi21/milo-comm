import OpenAI from "openai";
import { env } from "@/lib/validation/env";
import type { ModelGateway, ModelInput } from "./gateway";

export interface GatewayOptions {
  baseURL: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  mock: boolean;
}

export type ProviderTransport = (
  messages: ModelInput[],
  model: string,
  signal: AbortSignal,
) => AsyncIterable<string>;

const defaults: GatewayOptions = {
  baseURL: env.AI_BASE_URL,
  apiKey: env.AI_API_KEY,
  model: env.AI_MODEL,
  timeoutMs: env.AI_TIMEOUT_MS,
  mock: env.MOCK_AI === "true",
};

function mockResponse(messages: ModelInput[]) {
  const userMessages = messages.filter((message) => message.role === "user");
  const latest = userMessages.at(-1)?.content ?? "";
  const previous = userMessages.at(-2)?.content;
  return previous
    ? `پیام شما را بررسی کردم. زمینهٔ قبلی «${previous.slice(0, 60)}» و پرسش تازه «${latest.slice(0, 90)}» است.`
    : `پیام شما را بررسی کردم. دربارهٔ «${latest.slice(0, 90)}» چه کمکی از من می‌خواهید؟`;
}

function openAITransport(options: GatewayOptions): ProviderTransport {
  const client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
  return async function* transport(messages, model, signal) {
    const stream = await client.chat.completions.create({ model, messages, stream: true }, { signal });
    for await (const chunk of stream) yield chunk.choices[0]?.delta?.content ?? "";
  };
}

export class OpenAICompatibleGateway implements ModelGateway {
  private readonly options: GatewayOptions;
  private readonly transport?: ProviderTransport;

  constructor(options: Partial<GatewayOptions> = {}, transport?: ProviderTransport) {
    this.options = { ...defaults, ...options };
    this.transport = transport;
  }

  safeConfiguration() {
    return {
      baseURL: this.options.baseURL,
      model: this.options.model,
      timeoutMs: this.options.timeoutMs,
      hasApiKey: Boolean(this.options.apiKey),
    };
  }

  async *stream(messages: ModelInput[], signal?: AbortSignal) {
    const timeoutSignal = AbortSignal.timeout(this.options.timeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    if (this.options.mock) {
      for (const part of mockResponse(messages).split(" ")) {
        if (requestSignal.aborted) return;
        yield `${part} `;
        await new Promise((resolve) => setTimeout(resolve, 45));
      }
      return;
    }
    if (!this.options.apiKey) throw new Error("401 API key is missing");

    try {
      const transport = this.transport ?? openAITransport(this.options);
      for await (const part of transport(messages, this.options.model, requestSignal)) {
        if (typeof part !== "string") throw new Error("malformed stream");
        if (requestSignal.aborted) return;
        yield part;
      }
    } catch (error) {
      if (timeoutSignal.aborted && !signal?.aborted) throw new Error("timeout");
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : undefined;
      if (status === 401) throw new Error("401 provider authentication failed");
      if (status === 429) throw new Error("429 provider quota exceeded");
      throw error;
    }
  }

  async complete(messages: ModelInput[]) {
    let output = "";
    for await (const delta of this.stream(messages)) output += delta;
    return output.trim();
  }
}

export const modelGateway = new OpenAICompatibleGateway();

