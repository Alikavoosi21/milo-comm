import { z } from "zod";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_MESSAGE_BYTES = 20 * 1024 * 1024;
export const MAX_FILES = 3;
export const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt", "md", "csv"] as const;
export const attachmentMetaSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().max(100),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
});
