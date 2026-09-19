import { requireOwner } from "@/lib/auth/require-owner";
import { persistStore, store } from "@/lib/db/repositories";

export async function GET() {
  const ownerId = await requireOwner();
  return Response.json({ theme: store.themes.get(ownerId) ?? null });
}

export async function PUT(request: Request) {
  const ownerId = await requireOwner();
  const { theme } = await request.json();
  if (theme !== "light" && theme !== "dark") return Response.json({ error: "تم معتبر نیست" }, { status: 422 });
  store.themes.set(ownerId, theme); persistStore();
  return Response.json({ theme });
}

