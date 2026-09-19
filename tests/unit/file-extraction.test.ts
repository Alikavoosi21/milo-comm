import { describe, expect, it } from "vitest";
import { extractText } from "@/lib/files/extraction";

describe("extractText", () => {
  it("extracts UTF-8 text and bounds CSV rows, columns, cells, and total output", async () => {
    expect((await extractText(new TextEncoder().encode("سلام"), "txt")).text).toBe("سلام");
    const rows = Array.from({ length: 1100 }, (_, rowIndex) =>
      Array.from({ length: 60 }, (_, columnIndex) =>
        rowIndex === 0 && columnIndex === 0 ? "x".repeat(1100) : `v${rowIndex}`,
      ).join(","),
    ).join("\n");
    const extracted = await extractText(new TextEncoder().encode(rows), "csv");
    const outputRows = extracted.text.split("\n");
    expect(outputRows.length).toBeLessThanOrEqual(1000);
    expect(outputRows[0].split(" | ")).toHaveLength(50);
    expect(outputRows[0].split(" | ")[0]).toHaveLength(1000);
    expect(extracted.text.length).toBeLessThanOrEqual(50_000);
    expect(extracted.truncated).toBe(true);
  });

  it("rejects empty extraction and unsupported formats", async () => {
    await expect(extractText(new Uint8Array(), "txt")).rejects.toThrow(/استخراج/);
    await expect(extractText(new TextEncoder().encode("data"), "zip")).rejects.toThrow(/پشتیبانی/);
  });
});
