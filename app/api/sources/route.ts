import { listSources } from "@/lib/rag/knowledge-store";

export async function GET() {
  try {
    const sources = (await listSources())
      .filter((source) => source.activeVersion > 0 && (source.status === "ready" || source.status === "replacing"))
      .map((source) => ({ id: source.id, name: source.originalName }));
    return Response.json({ sources }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "خواندن فهرست منابع ممکن نیست." }, { status: 503 });
  }
}
