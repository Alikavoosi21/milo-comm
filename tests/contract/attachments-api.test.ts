import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, MAX_FILES } from "@/lib/validation/files";
import { store } from "@/lib/db/repositories";

vi.mock("@/lib/auth/require-owner", () => ({
  requireOwner: vi.fn(async () => "owner"),
}));
vi.mock("@/lib/files/storage", () => ({
  storePrivateFile: vi.fn(async () => "opaque-storage-key"),
}));

import { POST } from "@/app/api/attachments/route";

function upload(file: File) {
  const form = new FormData();
  form.set("file", file);
  return POST(new Request("http://local/api/attachments", { method: "POST", body: form }));
}

describe("attachment API contract", () => {
  beforeEach(() => store.attachments.clear());

  it("publishes limits and returns ready metadata for an accepted upload", async () => {
    expect(ACCEPTED_EXTENSIONS).toEqual(["pdf", "docx", "txt", "md", "csv"]);
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_FILES).toBe(3);

    const response = await upload(new File(["متن امن"], "note.txt", { type: "text/plain" }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ status: "ready", ownerId: "owner", storageKey: "opaque-storage-key", transitions: ["accepted", "extracting", "ready"] });
    expect(body.extractedText).toBeUndefined();
    expect(store.attachments.get(body.id)?.extractedText).toBe("متن امن");
  });

  it("returns a Persian 422 rejection with accepted formats", async () => {
    const response = await upload(new File(["PK"], "unsafe.zip", { type: "application/zip" }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toMatch(/پشتیبانی/);
    expect(body.accepted).toMatch(/PDF/);
  });
});

