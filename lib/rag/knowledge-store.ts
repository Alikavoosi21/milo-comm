import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ragStorageMode } from "@/lib/validation/env";
import { prepareRagDatabase, ragPool } from "./database";

export type SourceStatus = "processing" | "ready" | "failed" | "replacing";
export interface KnowledgeSource {
  id: string;
  originalName: string;
  storageKey: string | null;
  mimeType: string;
  byteSize: number;
  sha256: string;
  status: SourceStatus;
  activeVersion: number;
  errorCategory: string | null;
  createdAt: string;
  updatedAt: string;
}
type LocalData = { sources: KnowledgeSource[]; chunks: StoredChunk[]; usage: unknown[] };
export interface StoredChunk { id: string; sourceId: string; sourceVersion: number; chunkIndex: number; text: string; sourceName: string; page?: number; vector?: number[] }
const localPath = path.resolve(process.cwd(), process.env.MILO_DATA_DIR ?? ".data", "rag-store.json");
const useLocal = ragStorageMode === "local";
const globalState = globalThis as typeof globalThis & { __miloRagLocal?: LocalData; __miloRagMtime?: number };
function local(): LocalData {
  const mtime = existsSync(localPath) ? statSync(localPath).mtimeMs : 0;
  if (globalState.__miloRagLocal && globalState.__miloRagMtime === mtime) return globalState.__miloRagLocal;
  let value: LocalData = { sources: [], chunks: [], usage: [] };
  if (mtime) {
    try { value = { ...value, ...JSON.parse(readFileSync(localPath, "utf8")) }; } catch {}
  }
  globalState.__miloRagLocal = value;
  globalState.__miloRagMtime = mtime;
  return value;
}
export function saveLocal() {
  if (!useLocal || process.env.NODE_ENV === "test" || process.env.VITEST) return;
  mkdirSync(path.dirname(localPath), { recursive: true });
  const temp = localPath + ".tmp";
  writeFileSync(temp, JSON.stringify(local()), "utf8");
  renameSync(temp, localPath);
  globalState.__miloRagMtime = statSync(localPath).mtimeMs;
}
export function localChunks() { return local().chunks; }
export function replaceLocalChunks(next: StoredChunk[]) { local().chunks = next; saveLocal(); }
export function localUsage() { return local().usage; }
export function pushLocalUsage(event: unknown) { local().usage.push(event); saveLocal(); }

function fromRow(row: Record<string, unknown>): KnowledgeSource {
  return {
    id: String(row.id), originalName: String(row.original_name),
    storageKey: row.storage_key ? String(row.storage_key) : null,
    mimeType: String(row.mime_type), byteSize: Number(row.byte_size),
    sha256: String(row.sha256), status: String(row.status) as SourceStatus,
    activeVersion: Number(row.active_version), errorCategory: row.error_category ? String(row.error_category) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}
export async function listSources(): Promise<KnowledgeSource[]> {
  if (useLocal) return [...local().sources].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  await prepareRagDatabase();
  const result = await ragPool().query("SELECT * FROM knowledge_sources ORDER BY created_at");
  return result.rows.map(fromRow);
}
export async function getSource(id: string) {
  return (await listSources()).find((source) => source.id === id);
}
export async function reserveSource(input: Pick<KnowledgeSource, "originalName" | "mimeType" | "byteSize" | "sha256">) {
  const now = new Date().toISOString();
  const source: KnowledgeSource = {
    ...input, id: randomUUID(), storageKey: null, status: "processing", activeVersion: 0,
    errorCategory: null, createdAt: now, updatedAt: now,
  };
  if (useLocal) {
    if (local().sources.length >= 3) return undefined;
    local().sources.push(source); saveLocal(); return source;
  }
  await prepareRagDatabase();
  const client = await ragPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(302003)");
    const count = await client.query("SELECT count(*)::int AS total FROM knowledge_sources");
    if (Number(count.rows[0]?.total) >= 3) { await client.query("ROLLBACK"); return undefined; }
    await client.query(
      "INSERT INTO knowledge_sources (id, original_name, mime_type, byte_size, sha256, status) VALUES ($1,$2,$3,$4,$5,'processing')",
      [source.id, source.originalName, source.mimeType, source.byteSize, source.sha256]
    );
    await client.query("COMMIT");
    return source;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
export async function updateSource(id: string, patch: Partial<KnowledgeSource>) {
  const current = await getSource(id);
  if (!current) return undefined;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  if (useLocal) {
    local().sources = local().sources.map((item) => item.id === id ? next : item);
    saveLocal(); return next;
  }
  await prepareRagDatabase();
  await ragPool().query(
    "UPDATE knowledge_sources SET original_name=$2, storage_key=$3, mime_type=$4, byte_size=$5, sha256=$6, status=$7, active_version=$8, error_category=$9, updated_at=now() WHERE id=$1",
    [id, next.originalName, next.storageKey, next.mimeType, next.byteSize, next.sha256, next.status, next.activeVersion, next.errorCategory]
  );
  return next;
}
export async function removeSource(id: string) {
  const current = await getSource(id);
  if (!current) return undefined;
  if (useLocal) {
    local().sources = local().sources.filter((item) => item.id !== id);
    saveLocal();
  } else {
    await prepareRagDatabase();
    await ragPool().query("DELETE FROM knowledge_sources WHERE id=$1", [id]);
  }
  return current;
}



