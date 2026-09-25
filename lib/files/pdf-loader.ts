import "pdf-parse/worker";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { Document } from "@langchain/core/documents";
import { PDFParse } from "pdf-parse";

const MAX_PDF_TEXT_CHARS = 2_000_000;

function hasBrokenTextLayer(text: string): boolean {
  const words = text.normalize("NFKC").match(/\p{L}+/gu) ?? [];
  if (words.length < 80) return false;
  const isolated = words.filter((word) => word.length === 1).length / words.length;
  const repeated = words.filter((word) => /(.)\1/u.test(word)).length / words.length;
  return isolated > 0.45 && repeated > 0.3;
}

export class PdfDocumentError extends Error {}

/** Keeps PDF page boundaries in LangChain documents for retrieval and citations. */
export class PdfDocumentLoader extends BaseDocumentLoader {
  constructor(private readonly bytes: Uint8Array) { super(); }

  async load(): Promise<Document[]> {
    // PDF.js may transfer and detach its input buffer; preserve the upload bytes for storage.
    const parser = new PDFParse({ data: new Uint8Array(this.bytes) });
    try {
      const result = await parser.getText({ lineEnforce: true, cellSeparator: " ", pageJoiner: "" });
      let totalChars = 0;
      const documents: Document[] = [];
      for (const page of result.pages) {
        const pageContent = page.text.replace(/\0/g, "").replace(/\r\n?/g, "\n").trim();
        if (!pageContent) continue;
        if (hasBrokenTextLayer(pageContent)) {
          throw new PdfDocumentError("لایهٔ متن PDF مخدوش است؛ حروف به‌صورت جدا و تکراری استخراج می‌شوند. فایل را با OCR فارسی به PDF جست‌وجوپذیر تبدیل و دوباره بارگذاری کنید.");
        }
        totalChars += pageContent.length;
        if (totalChars > MAX_PDF_TEXT_CHARS) {
          throw new PdfDocumentError("متن PDF بیش از حد بزرگ است؛ فایل را به چند PDF کوچک‌تر تقسیم کنید.");
        }
        documents.push(new Document({ pageContent, metadata: { page: page.num, totalPages: result.total } }));
      }
      if (!documents.length) {
        throw new PdfDocumentError("در PDF متن قابل استخراج پیدا نشد. اگر فایل اسکن‌شده است، ابتدا OCR انجام دهید.");
      }
      return documents;
    } finally {
      await parser.destroy();
    }
  }
}


