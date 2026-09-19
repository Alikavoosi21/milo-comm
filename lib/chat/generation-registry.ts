import { randomUUID } from "node:crypto";

interface GenerationLease {
  id: string;
  revision: number;
  controller: AbortController;
  detachRequestSignal?: () => void;
}

const globalRegistry = globalThis as typeof globalThis & { __miloGenerationRegistry?: Map<string, GenerationLease> };
const registry = (globalRegistry.__miloGenerationRegistry ??= new Map<string, GenerationLease>());

export function registerGeneration(conversationId: string, revision: number, requestSignal?: AbortSignal) {
  const previous = registry.get(conversationId);
  previous?.controller.abort("generation-replaced");

  const controller = new AbortController();
  const id = randomUUID();
  let detachRequestSignal: (() => void) | undefined;
  if (requestSignal) {
    const abort = () => controller.abort(requestSignal.reason);
    if (requestSignal.aborted) abort();
    else {
      requestSignal.addEventListener("abort", abort, { once: true });
      detachRequestSignal = () => requestSignal.removeEventListener("abort", abort);
    }
  }
  registry.set(conversationId, { id, revision, controller, detachRequestSignal });
  return { id, revision, signal: controller.signal };
}

export function cancelGeneration(conversationId: string) {
  const lease = registry.get(conversationId);
  if (!lease) return false;
  lease.controller.abort("conversation-deleted");
  return true;
}

export function isGenerationLeaseActive(conversationId: string, leaseId: string, revision: number) {
  const lease = registry.get(conversationId);
  return Boolean(lease && lease.id === leaseId && lease.revision === revision && !lease.controller.signal.aborted);
}

export function releaseGeneration(conversationId: string, leaseId: string) {
  const lease = registry.get(conversationId);
  if (!lease || lease.id !== leaseId) return;
  lease.detachRequestSignal?.();
  registry.delete(conversationId);
}

export function resetGenerationRegistry() {
  for (const lease of registry.values()) lease.controller.abort("test-reset");
  registry.clear();
}
