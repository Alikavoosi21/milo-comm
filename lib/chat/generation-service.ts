import { modelGateway } from "@/lib/model/openai-compatible";
import type { ModelInput } from "@/lib/model/gateway";

export async function completeGeneration(messages: ModelInput[], signal?: AbortSignal) {
  let output = "";
  for await (const delta of modelGateway.stream(messages, signal)) output += delta;
  return output.trim();
}
