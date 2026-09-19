import mammoth from "mammoth";
import Papa from "papaparse";
import { PDFParse } from "pdf-parse";

const MAX_EXTRACTED_CHARS = 50_000;

export async function extractText(bytes: Uint8Array, extension: string) {
  let text = "";
  if (extension === "txt" || extension === "md") {
    text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } else if (extension === "csv") {
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const parsed = Papa.parse<string[]>(raw, { skipEmptyLines: true, preview: 1000 });
    text = (parsed.data as string[][]).slice(0, 1000).map((row) => row.slice(0, 50).map((cell) => String(cell).slice(0, 1000)).join(" | ")).join("\n");
  } else if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    text = result.value;
  } else if (extension === "pdf") {
    const parser = new PDFParse({ data: bytes });
    try { text = (await parser.getText({ first: 50 })).text; } finally { await parser.destroy(); }
  } else {
    throw new Error("نوع فایل پشتیبانی نمی‌شود");
  }
  const normalized = text.replace(/\0/g, "").trim();
  if (!normalized) throw new Error("متنی از فایل قابل استخراج نبود");
  return { text: normalized.slice(0, MAX_EXTRACTED_CHARS), truncated: normalized.length > MAX_EXTRACTED_CHARS };
}
