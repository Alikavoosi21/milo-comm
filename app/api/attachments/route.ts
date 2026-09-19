import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { persistStore, store } from "@/lib/db/repositories";
import { extractText } from "@/lib/files/extraction";
import { storePrivateFile } from "@/lib/files/storage";
import { validateFile } from "@/lib/files/validation";
import { allowUpload } from "@/lib/files/rate-limit";

const accepted = "PDF، DOCX، TXT، MD و CSV تا سقف ۱۰ مگابایت";

export async function POST(request: Request) {
  const ownerId = await requireOwner();
  if (!allowUpload(ownerId)) return NextResponse.json({ error: "تعداد بارگذاری‌ها زیاد است. یک دقیقه بعد دوباره تلاش کنید.", accepted }, { status: 429 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "فایلی انتخاب نشده است.", accepted }, { status: 422 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = await validateFile(file, bytes);
  if (!validation.ok) return NextResponse.json({ error: validation.reason, accepted }, { status: 422 });
  const id = randomUUID();
  try {
    const storageKey = await storePrivateFile(bytes);
    const extracted = await extractText(bytes, validation.extension);
    const attachment = { id, ownerId, originalName: file.name.replace(/[\x00-\x1f\\/]/g, "_"), declaredType: file.type, detectedType: validation.detectedMime, byteSize: file.size, status: "ready" as const, extractedText: extracted.text, storageKey };
    store.attachments.set(id, attachment); persistStore();
    return NextResponse.json({ ...attachment, transitions: ["accepted", "extracting", "ready"], extractedText: undefined, sha256: createHash("sha256").update(bytes).digest("hex"), truncated: extracted.truncated }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "فایل قابل خواندن نیست.", accepted }, { status: 422 });
  }
}



