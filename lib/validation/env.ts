import { z } from "zod";

const schema = z.object({
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().default(""),
  AI_MODEL: z.string().default("gpt-4.1-mini"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  MOCK_AI: z.enum(["true", "false"]).default("true"),
  RAG_STORAGE_MODE: z.enum(["local", "pgvector"]).optional(),
  DATABASE_URL: z.string().default(""),
  STORAGE_DIR: z.string().default(".data/uploads"),
  EMBEDDING_BASE_URL: z.string().default(""),
  EMBEDDING_API_KEY: z.string().default(""),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  RERANK_API_KEY: z.string().default(""),
  RERANK_MODEL: z.string().default("rerank-v4.0-fast"),
  WEB_SEARCH_URL: z.string().url().default("https://api.avalai.ir/v1/search/tavily-search"),
  WEB_SEARCH_API_KEY: z.string().default(""),
  WEB_SEARCH_COST_PER_QUERY: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().nonnegative().optional()),
  RAG_CANDIDATES: z.coerce.number().int().min(4).max(50).default(12),
  RAG_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.35),
  MEMORY_ACTIVE_TOKEN_LIMIT: z.coerce.number().int().min(256).default(12000),
  MEMORY_SUMMARY_TOKEN_LIMIT: z.coerce.number().int().min(128).default(1000),
  MEMORY_RECENT_MESSAGES: z.coerce.number().int().min(2).default(8),
  ADMIN_PASSWORD: z.string().default(""),
  ADMIN_SESSION_SECRET: z.string().default(""),
  AI_INPUT_COST_PER_MILLION: z.coerce.number().nonnegative().optional(),
  AI_OUTPUT_COST_PER_MILLION: z.coerce.number().nonnegative().optional(),
  EMBEDDING_COST_PER_MILLION: z.coerce.number().nonnegative().optional(),
  RERANK_COST_PER_THOUSAND: z.coerce.number().nonnegative().optional(),
  COST_CURRENCY: z.string().default("USD"),
});

export const env = schema.parse(process.env);
export const ragStorageMode = env.RAG_STORAGE_MODE ?? (env.MOCK_AI === "true" ? "local" : "pgvector");
if (ragStorageMode === "pgvector" && !env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required when RAG_STORAGE_MODE=pgvector.");
}

