import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ragStorageMode } from "@/lib/validation/env";
import { prepareRagDatabase, ragPool } from "./database";

export const ragSettingsSchema = z.object({
  strategy: z.enum(["recursive", "paragraph", "markdown", "token"]),
  retrievalStrategy: z.enum(["two_step", "broad", "rerank"]),
  chunkSize: z.number().int().min(100).max(4000),
  overlap: z.number().int().min(0).max(1000),
  candidateCount: z.number().int().min(4).max(40),
  resultCount: z.number().int().min(1).max(12),
  rerankTopK: z.number().int().min(1).max(4),
  minScore: z.number().min(0).max(1),
  answerMode: z.literal("sources"),
}).strict().refine((value) => value.overlap < value.chunkSize, {
  message: "هم‌پوشانی باید از اندازهٔ هر قطعه کمتر باشد.", path: ["overlap"],
}).refine((value) => value.retrievalStrategy !== "broad" || value.resultCount <= value.candidateCount, {
  message: "تعداد نتیجه‌ها نباید از تعداد نامزدها بیشتر باشد.", path: ["resultCount"],
});
export type RagSettings = z.infer<typeof ragSettingsSchema>;
export const defaultRagSettings: RagSettings = {
  strategy: "recursive", retrievalStrategy: "two_step", chunkSize: 1000, overlap: 15,
  candidateCount: 16, resultCount: 4, rerankTopK: 4, minScore: 0.25, answerMode: "sources",
};
const localPath = path.resolve(process.cwd(), process.env.MILO_DATA_DIR ?? ".data", "rag-settings.json");

export async function getRagSettings(): Promise<RagSettings> {
  if (ragStorageMode === "local") {
    if (!existsSync(localPath)) return defaultRagSettings;
    try { return ragSettingsSchema.parse({ ...defaultRagSettings, ...JSON.parse(readFileSync(localPath, "utf8")), answerMode: "sources" }); }
    catch { return defaultRagSettings; }
  }
  await prepareRagDatabase();
  const result = await ragPool().query("SELECT value FROM rag_settings WHERE id=1");
  return result.rows[0] ? ragSettingsSchema.parse({ ...defaultRagSettings, ...result.rows[0].value, answerMode: "sources" }) : defaultRagSettings;
}

export async function saveRagSettings(input: RagSettings) {
  const value = ragSettingsSchema.parse({ ...input, answerMode: "sources" });
  if (ragStorageMode === "local") {
    mkdirSync(path.dirname(localPath), { recursive: true });
    const temp = localPath + ".tmp";
    writeFileSync(temp, JSON.stringify(value), "utf8");
    renameSync(temp, localPath);
    return value;
  }
  await prepareRagDatabase();
  await ragPool().query("INSERT INTO rag_settings(id,value) VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET value=EXCLUDED.value", [JSON.stringify(value)]);
  return value;
}
