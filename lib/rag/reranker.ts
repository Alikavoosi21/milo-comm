import { CohereRerank } from "@langchain/cohere";
import { env, ragStorageMode } from "@/lib/validation/env";
import { localScore, type Candidate } from "./vector-store";

export interface RankedEvidence extends Candidate { rerankScore: number }
export async function rerankEvidence(question: string, candidates: Candidate[], topK = 4): Promise<RankedEvidence[]> {
  if (!candidates.length) return [];
  if (ragStorageMode === "local") {
    return candidates.map((item) => ({ ...item,
      rerankScore: Math.min(1, 0.65 * item.score + 0.35 * localScore(question, item.document.pageContent)),
    })).sort((a, b) => b.rerankScore - a.rerankScore).slice(0, topK);
  }
  if (!env.RERANK_API_KEY) throw new Error("RERANK_NOT_CONFIGURED");
  const reranker = new CohereRerank({ apiKey: env.RERANK_API_KEY, model: env.RERANK_MODEL, topN: topK });
  const scores = await reranker.rerank(candidates.map((item) => item.document), question, { topN: topK });
  return scores.map((item) => ({ ...candidates[item.index], rerankScore: item.relevanceScore }));
}

