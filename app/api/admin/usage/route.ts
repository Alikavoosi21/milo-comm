import { isAdmin } from "@/lib/auth/admin-session";
import { listUsage, type UsageOperation } from "@/lib/observability/usage";

const operations = new Set<UsageOperation>(["answer", "summarize", "rewrite", "embed", "rerank", "search"]);
export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "دسترسی ادمین لازم است." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const from = params.get("from") || undefined;
  const to = params.get("to") || undefined;
  const operation = params.get("operation") || undefined;
  if ((from && Number.isNaN(Date.parse(from))) || (to && Number.isNaN(Date.parse(to))) || (operation && !operations.has(operation as UsageOperation))) {
    return Response.json({ error: "فیلتر گزارش نامعتبر است." }, { status: 422 });
  }
  try {
    const items = await listUsage({ from, to, operation: operation as UsageOperation | undefined });
    const knownCosts = items.filter((item) => item.costAmount !== null);
    return Response.json({ items, totals: {
      inputTokens: items.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0),
      outputTokens: items.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0),
      cost: knownCosts.length === items.length ? knownCosts.reduce((sum, item) => sum + (item.costAmount ?? 0), 0) : null,
      currency: knownCosts.length === items.length ? knownCosts[0]?.currency ?? null : null,
    } });
  } catch { return Response.json({ error: "گزارش مصرف در دسترس نیست." }, { status: 503 }); }
}
