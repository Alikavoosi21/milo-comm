"use client";

import { useEffect, useState } from "react";
import type { UsageEvent, UsageOperation } from "@/lib/observability/usage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Totals = { inputTokens: number; outputTokens: number; cost: number | null; currency: string | null };
const operations: Record<UsageOperation, string> = { answer: "پاسخ", summarize: "خلاصه", rewrite: "بازنویسی", embed: "نمایه‌سازی", rerank: "بازرتبه‌بندی", search: "جست‌وجو" };

export function UsageReport() {
  const [operation, setOperation] = useState("");
  const [items, setItems] = useState<UsageEvent[]>([]);
  const [totals, setTotals] = useState<Totals>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const params = operation ? `?operation=${operation}` : "";
    fetch(`/api/admin/usage${params}`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "گزارش در دسترس نیست.");
      if (active) { setItems(data.items); setTotals(data.totals); setError(""); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "گزارش در دسترس نیست."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [operation]);
  return <section className="admin-content usage-report" aria-labelledby="usage-title">
    <div className="admin-usage-toolbar"><div><span className="admin-section-index">گزارش عملکرد</span><h2 id="usage-title">مصرف ثبت‌شده</h2><p>این جدول از رویدادهای واقعی عملیات ساخته می‌شود. توکن‌های برآوردی و عملیات آزمایشی مشخص شده‌اند؛ متن گفتگوها نمایش داده نمی‌شود.</p></div><label>نوع عملیات <select value={operation} onChange={(event) => { setLoading(true); setOperation(event.target.value); }}><option value="">همهٔ عملیات</option>{Object.entries(operations).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    {loading ? <p className="admin-loading" role="status">در حال دریافت گزارش…</p> : <><div className="usage-stat-grid"><Card><CardHeader><CardTitle>رویدادهای ثبت‌شده</CardTitle></CardHeader><CardContent>{items.length.toLocaleString("fa-IR")}</CardContent></Card><Card><CardHeader><CardTitle>توکن ورودی · شامل برآورد</CardTitle></CardHeader><CardContent>{(totals?.inputTokens ?? 0).toLocaleString("fa-IR")}</CardContent></Card><Card><CardHeader><CardTitle>توکن خروجی · شامل برآورد</CardTitle></CardHeader><CardContent>{(totals?.outputTokens ?? 0).toLocaleString("fa-IR")}</CardContent></Card><Card><CardHeader><CardTitle>هزینهٔ قابل محاسبه</CardTitle></CardHeader><CardContent>{totals?.cost == null ? "دادهٔ کافی نیست" : `${totals.cost.toLocaleString("fa-IR", { maximumFractionDigits: 4 })} ${totals.currency ?? ""}`}</CardContent></Card></div>
      {items.length ? <div className="usage-table-wrap"><table className="admin-usage-table"><thead><tr><th>زمان</th><th>عملیات</th><th>مدل و منبع</th><th>ورودی / خروجی</th><th>وضعیت</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString("fa-IR")}</td><td>{operations[item.operation]}</td><td><span dir="ltr">{item.modelName}</span><small className="usage-estimate">{item.estimated ? "توکن برآوردی" : "توکن ثبت‌شده"}{item.providerName === "local" ? " · اجرای محلی/آزمایشی" : ""}</small></td><td>{item.inputTokens == null ? "—" : item.inputTokens.toLocaleString("fa-IR")} / {item.outputTokens == null ? "—" : item.outputTokens.toLocaleString("fa-IR")}</td><td><Badge variant={item.status === "failed" ? "destructive" : "secondary"}>{item.status === "failed" ? "ناموفق" : "تکمیل‌شده"}</Badge></td></tr>)}</tbody></table></div> : <div className="admin-empty"><h3>هنوز داده‌ای برای این فیلتر ثبت نشده است</h3><p>پس از پاسخ‌گویی یا پردازش منبع، رویدادهای مصرف اینجا نمایش داده می‌شوند.</p></div>}
    </>}
  </section>;
}
