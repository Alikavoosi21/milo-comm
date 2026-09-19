import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/validation/env";

function privatePath(storageKey: string) {
  if (!storageKey || path.basename(storageKey) !== storageKey) throw new Error("INVALID_STORAGE_KEY");
  return path.join(env.STORAGE_DIR, storageKey);
}

export async function storePrivateFile(bytes: Uint8Array) {
  await mkdir(env.STORAGE_DIR, { recursive: true });
  const key = randomUUID();
  await writeFile(privatePath(key), bytes);
  return key;
}

export async function deletePrivateFile(storageKey: string) {
  try {
    await unlink(privatePath(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
