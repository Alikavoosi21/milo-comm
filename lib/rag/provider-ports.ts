import type { Document } from "@langchain/core/documents";
export interface EmbeddingPort {
  embedQuery(text: string): Promise<number[]>;
  embedDocuments(texts: string[]): Promise<number[][]>;
}
export interface KnowledgeVectorPort {
  index(documents: Document[], sourceId: string, version: number): Promise<void>;
  remove(sourceId: string, version?: number): Promise<void>;
  search(question: string, sourceId: string, version: number, limit: number): Promise<Array<{ document: Document; score: number }>>;
}
export interface RerankPort {
  rank(question: string, candidates: Array<{ document: Document; score: number }>): Promise<Array<{ document: Document; score: number; rerankScore: number }>>;
}
export interface UsagePort {
  record(event: { operation: "answer" | "summarize" | "embed" | "rerank"; inputTokens: number | null; outputTokens: number | null; status: "completed" | "failed" }): Promise<void>;
}
export interface ClockPort { now(): Date; }
