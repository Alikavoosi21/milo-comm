import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/attachments/route";

function upload(file: File) {
  const form = new FormData(); form.set("file", file);
  return POST(new Request("http://local/api/attachments", { method: "POST", body: form }));
}
describe("chat attachment API contract", () => {
  it("rejects a valid file because only admins can add knowledge sources", async () => {
    const response = await upload(new File(["متن امن"], "note.txt", { type: "text/plain" }));
    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/پنل مدیریت/);
  });
  it("rejects every file type before storing it", async () => {
    const response = await upload(new File(["PK"], "unsafe.zip", { type: "application/zip" }));
    expect(response.status).toBe(403);
  });
});
