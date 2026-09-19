import { z } from "zod";

const schema = z.object({
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().default(""),
  AI_MODEL: z.string().default("gpt-4.1-mini"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  MOCK_AI: z.enum(["true", "false"]).default("true"),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/milo_comm"),
  STORAGE_DIR: z.string().default(".data/uploads"),
});

export const env = schema.parse({
  AI_BASE_URL: process.env.AI_BASE_URL,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS,
  MOCK_AI: process.env.MOCK_AI,
  DATABASE_URL: process.env.DATABASE_URL,
  STORAGE_DIR: process.env.STORAGE_DIR,
});
