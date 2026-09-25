"use client";
import type { SourceCitation } from "@/lib/types";
export function SourceCitations({ items }: { items: SourceCitation[] }) {
  if (!items.length) return null;
  return <div className="source-citations" aria-label="منابع پاسخ"><span className="source-label">بر اساس</span>{items.map((item) =>
    item.url ? <a className="source-pill" key={item.sourceId + ":" + item.chunkIndex} href={item.url} target="_blank" rel="noopener noreferrer">↗ {item.sourceName}</a>
      : <span className="source-pill" key={item.sourceId + ":" + item.chunkIndex}>◫ {item.sourceName}{item.page ? " · صفحهٔ " + item.page : ""}</span>
  )}</div>;
}
