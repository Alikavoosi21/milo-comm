import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES } from "@/lib/validation/files";

const mimeByExtension: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain", "application/octet-stream"],
  md: ["text/markdown", "text/plain", "application/octet-stream"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"],
};

function rejection(reason: string) {
  return { ok: false as const, reason };
}

function isProbablyBinary(bytes: Uint8Array) {
  const sample = bytes.slice(0, 4096);
  if (sample.includes(0)) return true;
  const controlCount = sample.filter((byte) => byte < 9 || (byte > 13 && byte < 32)).length;
  return sample.length > 0 && controlCount / sample.length > 0.1;
}

export async function validateFile(file: File, bytes: Uint8Array) {
  const extension = path.extname(file.name).slice(1).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(extension as never)) {
    return rejection("نوع این فایل پشتیبانی نمی‌شود.");
  }
  if (!bytes.length || file.size !== bytes.length) {
    return rejection("فایل خالی یا ناقص است.");
  }
  if (file.size > MAX_FILE_BYTES) {
    return rejection("حجم فایل بیشتر از ۱۰ مگابایت است.");
  }
  if (/\.(docm|zip|rar|7z|exe|dll|msi|bat|cmd|ps1|sh)$/i.test(file.name)) {
    return rejection("فایل اجرایی، آرشیو یا دارای ماکرو پذیرفته نمی‌شود.");
  }

  const detected = await fileTypeFromBuffer(bytes);
  const detectedMime = detected?.mime ?? (file.type || "application/octet-stream");
  if (detected && !mimeByExtension[extension]?.includes(detectedMime)) {
    return rejection("محتوای واقعی فایل با پسوند آن مطابقت ندارد.");
  }

  if (extension === "pdf") {
    if (bytes.length < 100) return rejection("ساختار PDF معتبر نیست.");
    const header = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
    if (!/%PDF-\d\.\d/.test(header)) {
      return rejection("ساختار PDF معتبر نیست.");
    }
    const marker = new TextDecoder("latin1").decode(bytes);
    if (/\/Encrypt\b/.test(marker)) {
      return rejection("PDF رمزگذاری‌شده پذیرفته نمی‌شود.");
    }
  }

  if (extension === "docx") {
    const marker = new TextDecoder("latin1").decode(bytes);
    if (/vbaProject\.bin/i.test(marker)) {
      return rejection("فایل دارای ماکرو پذیرفته نمی‌شود.");
    }
  }

  if ((extension === "txt" || extension === "md" || extension === "csv") && isProbablyBinary(bytes)) {
    return rejection("محتوای فایل متنی معتبر نیست.");
  }

  return { ok: true as const, extension, detectedMime };
}

