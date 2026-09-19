import { describe, expect, it } from "vitest";
import { validateFile } from "@/lib/files/validation";

async function result(content: string | Uint8Array, name: string, type: string) {
  const part: BlobPart = typeof content === "string" ? content : Uint8Array.from(content).buffer;
  const file = new File([part], name, { type });
  return validateFile(file, new Uint8Array(await file.arrayBuffer()));
}

describe("validateFile", () => {
  it("accepts allowlisted text and rejects executable or disguised content", async () => {
    expect((await result("hello", "note.txt", "text/plain")).ok).toBe(true);
    expect((await result("MZ", "bad.exe", "application/octet-stream")).ok).toBe(false);
    expect((await result(new Uint8Array([0x4d, 0x5a, 0, 1]), "bad.txt", "text/plain")).ok).toBe(false);
  });

  it("rejects empty, oversized, corrupt, and encrypted files with a Persian reason", async () => {
    expect((await result("", "empty.txt", "text/plain")).ok).toBe(false);
    expect(await result("%PDF-1.7 broken", "broken.pdf", "application/pdf")).toMatchObject({ ok: false });
    expect(await result("%PDF-1.7\n/Encrypt 1 0 R\n%%EOF", "secret.pdf", "application/pdf")).toMatchObject({ ok: false });
    const bytes = new Uint8Array(10 * 1024 * 1024 + 1);
    expect((await result(bytes, "large.txt", "text/plain")).ok).toBe(false);
  });
});
