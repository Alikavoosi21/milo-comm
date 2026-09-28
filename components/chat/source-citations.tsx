"use client";

import type { SourceCitation } from "@/lib/types";
export function SourceCitations({ items, onShowEvidence }: { items: SourceCitation[]; onShowEvidence?(): void }) {
  if (!items.length) return null;
  return <div className="source-citations" aria-label="شواهد این پاسخ"><span className="source-label">شواهد پاسخ</span>{items.map((item) => item.url ? <a className="source-pill" key={item.sourceId + ":" + item.chunkIndex} href={item.url} target="_blank" rel="noopener noreferrer">↗ {item.sourceName}</a> : <span className="source-pill" key={item.sourceId + ":" + item.chunkIndex}>◫ {item.sourceName}{item.page ? " · صفحهٔ " + item.page : ""}</span>)}{onShowEvidence && <button type="button" className="source-evidence-open" onClick={onShowEvidence}>دیدن در پنل شواهد</button>}</div>;
}