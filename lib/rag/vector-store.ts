import { randomUUID } from "node:crypto";
import type { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/pgvector";
import { env, ragStorageMode } from "@/lib/validation/env";
import { estimateTokens, recordUsage } from "@/lib/observability/usage";
import { localChunks, replaceLocalChunks, type KnowledgeSource } from "./knowledge-store";
import { prepareRagDatabase } from "./database";

const localMode = ragStorageMode === "local";
let backfillPromise: Promise<void> | undefined;
function localEmbeddings() {
  return new OpenAIEmbeddings({
    model: env.EMBEDDING_MODEL,
    apiKey: env.EMBEDDING_API_KEY || env.AI_API_KEY,
    configuration: { baseURL: env.EMBEDDING_BASE_URL || env.AI_BASE_URL },
    batchSize: 1, // AvalAI currently accepts one input per embedding request.
  });
}
async function ensureLocalVectors() {
  if (env.MOCK_AI === "true" || !localChunks().some((chunk) => !chunk.vector?.length)) return;
  backfillPromise ??= (async () => {
    const missing = localChunks().filter((chunk) => !chunk.vector?.length);
    const started = Date.now();
    const requestId = randomUUID();
    try {
      const vectors = await localEmbeddings().embedDocuments(missing.map((chunk) => chunk.text));
      const byId = new Map(missing.map((chunk, index) => [chunk.id, vectors[index]]));
      replaceLocalChunks(localChunks().map((chunk) => ({ ...chunk, vector: byId.get(chunk.id) ?? chunk.vector })));
      await recordUsage({ requestId, operation: "embed", modelName: env.EMBEDDING_MODEL,
        providerName: "openai-compatible", inputTokens: estimateTokens(missing.map((chunk) => chunk.text).join("\n")),
        outputTokens: 0, estimated: true, durationMs: Date.now() - started, status: "completed", errorCategory: null });
    } catch (error) {
      await recordUsage({ requestId, operation: "embed", modelName: env.EMBEDDING_MODEL,
        providerName: "openai-compatible", inputTokens: estimateTokens(missing.map((chunk) => chunk.text).join("\n")),
        outputTokens: null, estimated: true, durationMs: Date.now() - started, status: "failed", errorCategory: "provider_error" }).catch(() => {});
      throw error;
    }
  })().finally(() => { backfillPromise = undefined; });
  await backfillPromise;
}
function cosine(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index]; aa += a[index] ** 2; bb += b[index] ** 2;
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
let vectorStorePromise: Promise<PGVectorStore> | undefined;
async function pgStore() {
  vectorStorePromise ??= (async () => {
    await prepareRagDatabase();
    const embeddings = new OpenAIEmbeddings({
      model: env.EMBEDDING_MODEL,
      apiKey: env.EMBEDDING_API_KEY || env.AI_API_KEY,
      configuration: { baseURL: env.EMBEDDING_BASE_URL || env.AI_BASE_URL },
    });
    return PGVectorStore.initialize(embeddings, {
      postgresConnectionOptions: { connectionString: env.DATABASE_URL },
      tableName: "knowledge_chunks",
      distanceStrategy: "cosine",
      scoreNormalization: "similarity",
    });
  })().catch((error) => { vectorStorePromise = undefined; throw error; });
  return vectorStorePromise;
}

export async function indexDocuments(documents: Document[], sourceId: string, version: number) {
  if (localMode) {
    const vectors = env.MOCK_AI === "true" ? undefined : await localEmbeddings().embedDocuments(documents.map((document) => document.pageContent));
    const added = documents.map((document, index) => ({
      id: randomUUID(), sourceId, sourceVersion: version,
      chunkIndex: Number(document.metadata.chunkIndex),
      sourceName: String(document.metadata.sourceName),
      page: Number.isInteger(document.metadata.page) ? Number(document.metadata.page) : undefined,
      text: document.pageContent,
      ...(vectors ? { vector: vectors[index] } : {}),
    }));
    replaceLocalChunks([...localChunks(), ...added]);
    return;
  }
  const store = await pgStore();
  await store.addDocuments(documents, { ids: documents.map(() => randomUUID()) });
}

export async function deleteDocuments(sourceId: string, version?: number) {
  if (localMode) {
    replaceLocalChunks(localChunks().filter((part) => part.sourceId !== sourceId || (version !== undefined && part.sourceVersion !== version)));
    return;
  }
  const store = await pgStore();
  await store.delete({ filter: version === undefined ? { sourceId } : { sourceId, sourceVersion: version } });
}

export interface Candidate { document: Document; score: number }
const stopWords = new Set(["از", "به", "در", "با", "که", "را", "برای", "این", "آن", "است", "هست", "هستند", "بود", "شود", "شده", "چه", "چیست", "چقدر", "کدام", "چگونه", "لطفا", "کنید"]);
function terms(value: string) {
  const normalized = value.normalize("NFKC").toLowerCase()
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u200c\u200d]/g, "");
  return new Set((normalized.match(/[\p{L}\p{N}]+/gu) ?? []).filter((term) => term.length > 1 && !stopWords.has(term)));
}
export function localScore(query: string, text: string) {
  const ask = terms(query);
  if (!ask.size) return 0;
  const found = terms(text);
  let common = 0;
  for (const term of ask) if (found.has(term)) common++;
  return common / ask.size;
}
export async function broadRetrieve(question: string, active: KnowledgeSource[], candidateCount = env.RAG_CANDIDATES): Promise<Candidate[]> {
  if (!active.length) return [];
  if (localMode) {
    await ensureLocalVectors();
    const queryVector = env.MOCK_AI === "true" ? undefined : await localEmbeddings().embedQuery(question);
    const overview = /(?:محتوا|موضوع|خلاصه|چکیده|فایل|سند)/u.test(question);
    return localChunks()
      .filter((part) => active.some((source) => source.id === part.sourceId && source.activeVersion === part.sourceVersion))
      .map((part) => ({
        document: { pageContent: part.text, metadata: {
          sourceId: part.sourceId, sourceName: part.sourceName,
          sourceVersion: part.sourceVersion, chunkIndex: part.chunkIndex,
          ...(part.page ? { page: part.page } : {}),
        } },
        score: queryVector && part.vector
          ? Math.min(1, 0.8 * cosine(queryVector, part.vector) + 0.2 * localScore(question, part.text)
            + (overview && part.chunkIndex === 0 ? 0.3 : 0)
            + (overview && /(?:خلاصه|خالصه)\s*مدیریتی/u.test(part.text.slice(0, 150)) ? 0.25 : 0))
          : localScore(question, part.text),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, candidateCount);
  }
  const store = await pgStore();
  const perSource = await Promise.all(active.map(async (source) =>
    store.similaritySearchWithScore(question, candidateCount, {
      sourceId: source.id, sourceVersion: source.activeVersion,
    })
  ));
  return perSource.flat()
    .map(([document, score]) => ({ document, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, candidateCount);
}





