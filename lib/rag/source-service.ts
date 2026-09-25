import { createHash, randomUUID } from "node:crypto";
import { Document } from "@langchain/core/documents";
import path from "node:path";
import { deletePrivateFile, readPrivateFile, storePrivateFile } from "@/lib/files/storage";
import { extractText } from "@/lib/files/extraction";
import { PdfDocumentError, PdfDocumentLoader } from "@/lib/files/pdf-loader";
import { validateFile } from "@/lib/files/validation";
import { estimateTokens, recordUsage } from "@/lib/observability/usage";
import { env, ragStorageMode } from "@/lib/validation/env";
import { splitKnowledgeDocuments } from "./chunking";
import { getRagSettings, saveRagSettings, type RagSettings } from "./settings";
import { deleteDocuments, indexDocuments } from "./vector-store";
import { getSource, listSources, reserveSource, updateSource, removeSource, type KnowledgeSource } from "./knowledge-store";

export class SourceError extends Error {
  constructor(message: string, public status: number, cause?: unknown) { super(message, { cause }); }
}
async function readAndValidate(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await validateFile(file, bytes);
  if (!result.ok) throw new SourceError(result.reason, 422);
  let documents: Document[];
  try {
    if (result.extension === "pdf") {
      documents = await new PdfDocumentLoader(bytes).load();
    } else {
      const extracted = await extractText(bytes, result.extension, 2_000_000);
      if (extracted.truncated) throw new SourceError("متن فایل بیش از حد بزرگ است؛ آن را به چند فایل کوچک‌تر تقسیم کنید.", 422);
      documents = [new Document({ pageContent: extracted.text, metadata: {} })];
    }
  } catch (error) {
    if (error instanceof SourceError) throw error;
    if (error instanceof PdfDocumentError) throw new SourceError(error.message, 422);
    if (result.extension === "pdf") throw new SourceError("PDF قابل خواندن نیست؛ ساختار فایل یا لایهٔ متن آن را بررسی کنید.", 422);
    throw new SourceError("متنی از فایل قابل استخراج نبود.", 422);
  }
  return {
    bytes, documents,
    name: path.basename(file.name).replace(/[\x00-\x1f\\/]/g, "_").slice(0, 255),
    mimeType: result.detectedMime,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
async function indexWithUsage(documents: Document[], sourceId: string, sourceName: string, version: number, settings?: RagSettings) {
  const started = Date.now();
  const requestId = randomUUID();
  const docs = await splitKnowledgeDocuments(documents, sourceId, sourceName, version, settings ?? await getRagSettings());
  const inputTokens = documents.reduce((count, document) => count + estimateTokens(document.pageContent), 0);
  try {
    await indexDocuments(docs, sourceId, version);
    await recordUsage({
      requestId, operation: "embed", modelName: ragStorageMode === "local" && env.MOCK_AI === "true" ? "local-lexical" : env.EMBEDDING_MODEL,
      providerName: ragStorageMode === "local" && env.MOCK_AI === "true" ? "local" : "openai-compatible",
      inputTokens: inputTokens, outputTokens: 0, estimated: true,
      durationMs: Date.now() - started, status: "completed", errorCategory: null,
    });
  } catch (error) {
    await recordUsage({
      requestId, operation: "embed", modelName: env.EMBEDDING_MODEL, providerName: "openai-compatible",
      inputTokens: inputTokens, outputTokens: null, estimated: true,
      durationMs: Date.now() - started, status: "failed", errorCategory: "indexing_failed",
    }).catch(() => {});
    throw error;
  }
}
export async function createKnowledgeSource(file: File) {
  const input = await readAndValidate(file);
  const reserved = await reserveSource({
    originalName: input.name, mimeType: input.mimeType,
    byteSize: file.size, sha256: input.sha256,
  });
  if (!reserved) throw new SourceError("حداکثر سه منبع مجاز است. یک منبع را حذف یا جایگزین کنید.", 409);
  let key: string | undefined;
  try {
    key = await storePrivateFile(input.bytes);
    await indexWithUsage(input.documents, reserved.id, input.name, 1);
    return await updateSource(reserved.id, { storageKey: key, status: "ready", activeVersion: 1 });
  } catch (error) {
    if (key) await deletePrivateFile(key).catch(() => {});
    await deleteDocuments(reserved.id, 1).catch(() => {});
    await updateSource(reserved.id, { status: "failed", errorCategory: "indexing_failed" });
    throw new SourceError("آماده‌سازی منبع ناموفق بود. می‌توانید دوباره تلاش کنید.", 422, error);
  }
}
export async function replaceKnowledgeSource(sourceId: string, file: File) {
  const previous = await getSource(sourceId);
  if (!previous) throw new SourceError("منبع پیدا نشد.", 404);
  const input = await readAndValidate(file);
  await updateSource(sourceId, { status: "replacing", errorCategory: null });
  const version = previous.activeVersion + 1;
  let key: string | undefined;
  try {
    key = await storePrivateFile(input.bytes);
    await indexWithUsage(input.documents, sourceId, input.name, version);
    const active = await updateSource(sourceId, {
      originalName: input.name, mimeType: input.mimeType, byteSize: file.size,
      sha256: input.sha256, storageKey: key, status: "ready",
      activeVersion: version, errorCategory: null,
    });
    if (previous.activeVersion) await deleteDocuments(sourceId, previous.activeVersion).catch(() => {});
    if (previous.storageKey) await deletePrivateFile(previous.storageKey).catch(() => {});
    return active;
  } catch {
    if (key) await deletePrivateFile(key).catch(() => {});
    await deleteDocuments(sourceId, version).catch(() => {});
    await updateSource(sourceId, {
      status: previous.activeVersion ? "ready" : "failed",
      errorCategory: "replacement_failed",
    });
    throw new SourceError("جایگزینی ناموفق بود؛ نسخهٔ قبلی همچنان فعال است.", 422);
  }
}
export async function deleteKnowledgeSource(sourceId: string): Promise<KnowledgeSource> {
  const source = await getSource(sourceId);
  if (!source) throw new SourceError("منبع پیدا نشد.", 404);
  await deleteDocuments(sourceId);
  await removeSource(sourceId);
  if (source.storageKey) await deletePrivateFile(source.storageKey).catch(() => {});
  return source;
}






let reindexing = false;
export async function applyRagSettings(next: RagSettings) {
  if (reindexing) throw new SourceError("بازسازی منابع در جریان است. کمی بعد دوباره تلاش کنید.", 409);
  reindexing = true;
  const staged: { source: KnowledgeSource; version: number }[] = [];
  try {
    const previous = await getRagSettings();
    const changed = previous.strategy !== next.strategy || previous.chunkSize !== next.chunkSize || previous.overlap !== next.overlap;
    if (changed) {
      const allSources = await listSources();
      if (allSources.some((source) => source.status === "processing" || source.status === "replacing")) {
        throw new SourceError("یک منبع در حال پردازش است. پس از آماده‌شدن آن، تنظیمات را ذخیره کنید.", 409);
      }
      const sources = allSources.filter((source) => source.status === "ready" && source.activeVersion > 0 && source.storageKey);
      for (const source of sources) {
        const version = source.activeVersion + 1;
        try {
          const bytes = await readPrivateFile(source.storageKey!);
          const file = new File([Buffer.from(bytes)], source.originalName, { type: source.mimeType });
          const input = await readAndValidate(file);
          await indexWithUsage(input.documents, source.id, source.originalName, version, next);
          staged.push({ source, version });
        } catch (error) {
          await deleteDocuments(source.id, version).catch(() => {});
          throw new SourceError(`بازسازی «${source.originalName}» انجام نشد؛ نسخهٔ قبلی فعال ماند.`, 422, error);
        }
      }
      for (const item of staged) await updateSource(item.source.id, { activeVersion: item.version, status: "ready", errorCategory: null });
    }
    await saveRagSettings(next);
    for (const item of staged) await deleteDocuments(item.source.id, item.source.activeVersion).catch(() => {});
    return { settings: next, reindexedSources: staged.length };
  } catch (error) {
    for (const item of staged) {
      await updateSource(item.source.id, { activeVersion: item.source.activeVersion, status: item.source.status, errorCategory: item.source.errorCategory }).catch(() => {});
      await deleteDocuments(item.source.id, item.version).catch(() => {});
    }
    throw error;
  } finally { reindexing = false; }
}
