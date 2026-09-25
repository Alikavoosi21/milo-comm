import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteKnowledgeSource } from "@/lib/rag/source-service";
import { listSources } from "@/lib/rag/knowledge-store";

const auth = vi.hoisted(() => ({ admin: false }));
vi.mock("@/lib/auth/admin-session", () => ({
  isAdmin: async () => auth.admin,
  sameOrigin: () => true,
}));
import { GET, POST } from "@/app/api/admin/sources/route";
import { DELETE, PUT } from "@/app/api/admin/sources/[sourceId]/route";

type LocalState = { sources: unknown[]; chunks: unknown[]; usage: unknown[] };
beforeEach(() => {
  auth.admin = false;
  (globalThis as typeof globalThis & { __miloRagLocal?: LocalState }).__miloRagLocal = { sources: [], chunks: [], usage: [] };
});
function sourceFile(name: string) { return new File(["پاسخ معتبر دربارهٔ محصول"], name, { type: "text/plain" }); }
function form(file?: File) {
  const data = new FormData();
  if (file) data.set("file", file);
  return new Request("http://local/api/admin/sources", { method: "POST", body: data });
}
describe("admin source API contract", () => {
  it("denies anonymous reads and writes", async () => {
    expect((await GET()).status).toBe(401);
    expect((await POST(form(sourceFile("a.txt")))).status).toBe(401);
    expect((await DELETE(new Request("http://local", { method: "DELETE" }), { params: Promise.resolve({ sourceId: crypto.randomUUID() }) })).status).toBe(401);
  });
  it("reports missing files, three-source cap and successful deletion", async () => {
    auth.admin = true;
    expect((await POST(form())).status).toBe(422);
    const ids: string[] = [];
    for (let index = 0; index < 3; index++) {
      const response = await POST(form(sourceFile("a" + index + ".txt")));
      expect(response.status).toBe(201);
      ids.push((await response.json()).id as string);
    }
    expect((await GET()).status).toBe(200);
    expect((await POST(form(sourceFile("fourth.txt")))).status).toBe(409);
    const response = await PUT(new Request("http://local/api/admin/sources/" + ids[0], {
      method: "PUT", body: (() => { const data = new FormData(); data.set("file", sourceFile("new.txt")); return data; })(),
    }), { params: Promise.resolve({ sourceId: ids[0] }) });
    expect(response.status).toBe(200);
    expect((await listSources()).find((item) => item.id === ids[0])?.activeVersion).toBe(2);
    for (const id of ids) await deleteKnowledgeSource(id);
    expect((await GET()).status).toBe(200);
  });
});


