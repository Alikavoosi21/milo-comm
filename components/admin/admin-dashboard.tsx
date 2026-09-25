"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KnowledgeSource } from "@/lib/rag/knowledge-store";
import type { RagSettings } from "@/lib/rag/settings";

type View = "sources" | "chunking";
const retrievalStrategies: { id: RagSettings["retrievalStrategy"]; title: string; description: string; detail: string }[] = [
  { id: "two_step", title: "RAG دو مرحله‌ای", description: "بازیابی گسترده و سپس بازرتبه‌بندی مشاهده‌های مرتبط.", detail: "برای پاسخ دقیق از فایل‌های محدود؛ پیشنهاد پیش‌فرض" },
  { id: "broad", title: "بازیابی گسترده", description: "قطعه‌ها بر اساس جست‌وجوی اولیه انتخاب می‌شوند و بازرتبه‌بندی نمی‌شوند.", detail: "برای مرور کلی یا وقتی پوشش بیشتر مهم است" },
  { id: "rerank", title: "بازرتبه‌بندی ۴ نتیجهٔ برتر", description: "ابتدا نامزدها بازیابی می‌شوند و سپس مرتبط‌ترین نتیجه‌ها دوباره مرتب می‌شوند.", detail: "برای پرسش مشخص و انتخاب محدودترین نتیجه‌ها" },
];
function persianError(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : "";
  return /[\u0600-\u06ff]/u.test(message) ? message : fallback;
}

export function AdminDashboard({ view }: { view: View }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [modelMode, setModelMode] = useState<"demo" | "ai">("demo");
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [settings, setSettings] = useState<RagSettings>();
  const [savedSettings, setSavedSettings] = useState<RagSettings>();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string>();
  const uploadRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (kind: View) => {
    if (kind === "sources") {
      const response = await fetch("/api/admin/sources", { cache: "no-store" });
      if (!response.ok) throw new Error("دریافت منابع ممکن نشد.");
      const data = await response.json();
      setSources(data.sources);
    } else {
      const response = await fetch("/api/admin/rag-settings", { cache: "no-store" });
      if (!response.ok) throw new Error("دریافت تنظیمات ممکن نشد.");
      const data: { settings: RagSettings } = await response.json();
      setSettings({ ...data.settings, strategy: "recursive", answerMode: "sources" }); setSavedSettings(data.settings);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session").then((response) => response.json()).then(async (session) => {
      if (!active) return;
      setConfigured(session.configured);
      setAuthenticated(session.authenticated);
      setModelMode(session.modelMode === "ai" ? "ai" : "demo");
      setReady(true);
      if (session.authenticated) await load(view);
    }).catch(() => { if (active) { setError("ارتباط با پنل مدیریت برقرار نشد."); setReady(true); } });
    return () => { active = false; };
  }, [view, load]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy("login"); setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setPassword(""); setAuthenticated(true); await load(view);
    } catch (cause) { setError(persianError(cause, "ورود انجام نشد؛ رمز عبور و اتصال را بررسی کنید.")); }
    finally { setBusy(""); }
  }
  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false); setSources([]); setSettings(undefined);
  }
  async function upload(file: File, sourceId?: string) {
    setBusy(sourceId || "upload"); setError(""); setNotice("");
    try {
      const data = new FormData(); data.set("file", file);
      const response = await fetch(sourceId ? "/api/admin/sources/" + sourceId : "/api/admin/sources", {
        method: sourceId ? "PUT" : "POST", body: data,
      });
      if (!response.ok) throw new Error((await response.json()).error);
      await load("sources");
      setNotice(sourceId ? "منبع با موفقیت جایگزین شد." : "منبع آمادهٔ پاسخ‌گویی است.");
    } catch (cause) { setError(persianError(cause, "آماده‌سازی فایل انجام نشد؛ دوباره تلاش کنید.")); await load("sources").catch(() => {}); }
    finally { if (uploadRef.current) uploadRef.current.value = ""; setBusy(""); }
  }
  async function remove(id: string) {
    if (busy) return;
    setBusy(id); setError(""); setConfirmDelete(undefined);
    try {
      const response = await fetch("/api/admin/sources/" + id, { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error((await response.json()).error);
      setSources((current) => current.filter((source) => source.id !== id));
      void load("sources").catch(() => {});
      setNotice("منبع حذف شد.");
    } catch (cause) { setError(persianError(cause, "حذف انجام نشد؛ دوباره تلاش کنید.")); }
    finally { setBusy(""); }
  }
  async function saveSettings(event: React.FormEvent) {
    event.preventDefault(); if (!settings || busy) return;
    if (!Number.isInteger(settings.candidateCount) || settings.candidateCount < 4 || settings.candidateCount > 40) { setError("تعداد نامزدها باید عددی بین ۴ تا ۴۰ باشد."); return; }
    if (settings.retrievalStrategy === "broad" && (!Number.isInteger(settings.resultCount) || settings.resultCount < 1 || settings.resultCount > Math.min(12, settings.candidateCount))) { setError("تعداد نتیجه‌های ارسالی باید بین ۱ و تعداد نامزدها باشد و از ۱۲ بیشتر نشود."); return; }
    if (settings.retrievalStrategy !== "broad" && (!Number.isInteger(settings.rerankTopK) || settings.rerankTopK < 1 || settings.rerankTopK > 4)) { setError("تعداد نتیجه‌های برتر باید عددی بین ۱ تا ۴ باشد."); return; }
    if (!Number.isInteger(settings.chunkSize) || settings.chunkSize < 200 || settings.chunkSize > 4000) { setError("اندازهٔ هر قطعه باید بین ۲۰۰ تا ۴۰۰۰ نویسه باشد."); return; }
    if (!Number.isInteger(settings.overlap) || settings.overlap < 0 || settings.overlap > 1000 || settings.overlap >= settings.chunkSize) { setError("هم‌پوشانی باید بین ۰ تا ۱۰۰۰ نویسه و کوچک‌تر از اندازهٔ قطعه باشد."); return; }
    setBusy("settings"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/rag-settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSettings(body.settings); setSavedSettings(body.settings);
      setNotice(body.reindexedSources ? `تنظیمات ذخیره شد و ${body.reindexedSources.toLocaleString("fa-IR")} منبع دوباره چانک‌بندی شد.` : "تنظیمات پاسخ‌گویی ذخیره شد.");
    } catch (cause) { setError(persianError(cause, "ذخیرهٔ تنظیمات انجام نشد؛ دوباره تلاش کنید.")); }
    finally { setBusy(""); }
  }
  const dirty = settings && savedSettings && JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const requiresReindex = settings && savedSettings && (settings.strategy !== savedSettings.strategy || settings.chunkSize !== savedSettings.chunkSize || settings.overlap !== savedSettings.overlap);

  return <main className="admin-shell" dir="rtl">
    <div className="admin-frame">
      <header className="admin-header">
        <Link href="/" className="admin-brand" aria-label="بازگشت به گفتگو"><span className="admin-brand-mark">م</span><span><strong>MILO COMM</strong><small>مدیریت دانش</small></span></Link>
        <div className="admin-header-actions"><Link href="/" className="admin-text-link">پنل گفتگو ↗</Link>{authenticated && <button className="admin-logout" onClick={() => void logout()}>خروج</button>}</div>
      </header>
      {!ready ? <p className="admin-loading" role="status">در حال بارگذاری پنل…</p> : !authenticated ? <section className="admin-login-card" aria-labelledby="login-title">
        <span className="admin-kicker">دسترسی مدیر</span><h1 id="login-title">ورود به پنل مدیریت</h1>
        <p>منابع، چانکینگ و شیوهٔ پاسخ‌گویی از اینجا مدیریت می‌شوند.</p>
        {!configured && <p className="admin-alert" role="alert">ADMIN_PASSWORD و ADMIN_SESSION_SECRET را در تنظیمات سرور وارد کنید.</p>}
        <form onSubmit={(event) => void login(event)}><label htmlFor="admin-password">رمز عبور</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="admin-primary" disabled={busy === "login" || !configured}>{busy === "login" ? "در حال ورود…" : "ورود به پنل"}</button></form>
        {error && <p className="admin-alert" role="alert">{error}</p>}
      </section> : <>
        <section className="admin-hero"><div><span className="admin-kicker">پایگاه دانش · کنترل پاسخ</span><h1>{view === "sources" ? "منابع پاسخ‌گویی" : "راهبرد RAG"}</h1><p>{view === "sources" ? "تا سه فایل را ثبت کنید تا در مجموعهٔ دانش آماده شوند." : "روش بازیابی و اندازهٔ قطعه‌های متن را برای گفتگوها تنظیم کنید."}</p>{modelMode === "demo" && <p>حالت آزمایشی فعال است؛ مدل واقعی برای پاسخ‌ها استفاده نمی‌شود.</p>}</div>{view === "sources" && <div className="admin-hero-decoration" aria-hidden="true"><span>۰۳</span><small>منبع مجاز</small></div>}</section>
        <nav className="admin-tabs" aria-label="بخش‌های مدیریت"><Link className={view === "sources" ? "active" : ""} href="/admin" aria-current={view === "sources" ? "page" : undefined}>منابع دانش</Link><Link className={view === "chunking" ? "active" : ""} href="/admin/chunking" aria-current={view === "chunking" ? "page" : undefined}>راهبرد RAG</Link></nav>
        {(error || notice) && <div className={error ? "admin-alert" : "admin-notice"} role={error ? "alert" : "status"}>{error || notice}</div>}
        {view === "sources" ? <div className="admin-content">
          <section className="admin-upload-card"><div><span className="admin-section-index">۰۱ / افزودن منبع</span><h2>فایل تازه</h2><p>PDF، DOCX، TXT، MD یا CSV · حداکثر ۱۰ مگابایت برای هر فایل</p></div><label className={"admin-upload-button" + (busy || sources.length >= 3 ? " disabled" : "")}><input ref={uploadRef} type="file" accept=".pdf,.docx,.txt,.md,.csv" disabled={Boolean(busy) || sources.length >= 3} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /><span>{busy === "upload" ? "در حال آماده‌سازی…" : "＋ انتخاب فایل"}</span></label></section>
          <section className="admin-sources-section" aria-labelledby="sources-title"><div className="admin-section-heading"><div><span className="admin-section-index">۰۲ / منابع فعال</span><h2 id="sources-title">مجموعهٔ دانش</h2></div><span className="admin-count">{sources.length.toLocaleString("fa-IR")} از ۳ منبع</span></div><div className="admin-source-list">{sources.length ? sources.map((source, index) => <article className="admin-source-card" key={source.id}><span className="admin-source-number">{(index + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</span><div className="admin-source-info"><h3>{source.originalName}</h3><p>{source.byteSize < 1024 ? source.byteSize + " بایت" : (source.byteSize / 1024).toFixed(1) + " کیلوبایت"} · نسخهٔ {source.activeVersion || "در انتظار"}</p>{source.errorCategory && <small className="admin-source-error">{source.activeVersion > 0 ? "پردازش تازه ناموفق بود؛ نسخهٔ سالم قبلی فعال است." : "فایل پردازش نشد؛ آن را حذف یا جایگزین کنید."}</small>}</div><span className={"admin-source-status " + source.status}>{source.status === "ready" ? "آماده" : source.status === "replacing" ? "در حال جایگزینی" : source.status === "processing" ? "در حال پردازش" : "ناموفق"}</span><div className="admin-source-actions"><label className="admin-link-button"><input type="file" accept=".pdf,.docx,.txt,.md,.csv" disabled={Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, source.id); event.target.value = ""; }} />جایگزینی</label>{source.status === "failed" && source.activeVersion === 0 ? <button className="admin-danger" disabled={Boolean(busy)} onClick={() => void remove(source.id)}>پاک‌کردن منبع ناموفق</button> : confirmDelete === source.id ? <><button disabled={Boolean(busy)} onClick={() => void remove(source.id)} className="admin-danger">حذف قطعی</button><button disabled={Boolean(busy)} onClick={() => setConfirmDelete(undefined)}>انصراف</button></> : <button disabled={Boolean(busy)} onClick={() => setConfirmDelete(source.id)}>حذف</button>}</div></article>) : <div className="admin-empty"><span aria-hidden="true">◇</span><h3>هنوز منبعی ثبت نشده است</h3><p>اولین فایل را اضافه کنید تا پاسخ‌های مستند آماده شوند.</p></div>}</div></section>
        </div> : settings ? <form className="admin-content rag-settings rag-workbench" noValidate onSubmit={(event) => void saveSettings(event)}>
          <section className="rag-section" aria-labelledby="rag-strategy-title">
            <div className="rag-section-heading"><span className="admin-section-index">۰۱ / انتخاب راهبرد</span><h2 id="rag-strategy-title">شیوهٔ بازیابی</h2><p>یکی از سه روش را بر اساس نوع پرسش‌ها انتخاب کنید. هر روش تنظیمات لازم خودش را نشان می‌دهد.</p></div>
            <fieldset className="rag-strategy-grid"><legend className="sr-only">راهبرد بازیابی</legend>{retrievalStrategies.map((item) => <label className={"rag-choice" + (settings.retrievalStrategy === item.id ? " selected" : "")} key={item.id}>
              <input type="radio" name="retrievalStrategy" value={item.id} checked={settings.retrievalStrategy === item.id} onChange={() => setSettings({ ...settings, retrievalStrategy: item.id })} />
              <span className="rag-choice-mark" aria-hidden="true">{settings.retrievalStrategy === item.id ? "●" : "○"}</span><strong>{item.title}</strong><small>{item.description}</small><em>{item.detail}</em>
            </label>)}</fieldset>
            <div className="rag-config-panel"><h3>تنظیمات {retrievalStrategies.find((item) => item.id === settings.retrievalStrategy)?.title}</h3>
              <div className="rag-config-grid">
                <label><span>تعداد نامزدهای بازیابی</span><small>از ۴ تا ۴۰ قطعه از منابع پیدا می‌شود.</small><input type="number" min="4" max="40" step="1" value={settings.candidateCount} onChange={(event) => setSettings({ ...settings, candidateCount: Number(event.target.value) })} /></label>
                {settings.retrievalStrategy === "broad" ? <label><span>تعداد نتیجه‌های ارسالی</span><small>از ۱ تا ۱۲ قطعه؛ بازرتبه‌بندی انجام نمی‌شود.</small><input type="number" min="1" max={Math.min(12, settings.candidateCount)} step="1" value={settings.resultCount} onChange={(event) => setSettings({ ...settings, resultCount: Number(event.target.value) })} /></label>
                  : <label><span>تعداد نتیجه‌های برتر</span><small>از ۱ تا ۴ مشاهده پس از بازرتبه‌بندی.</small><input type="number" min="1" max="4" step="1" value={settings.rerankTopK} onChange={(event) => setSettings({ ...settings, rerankTopK: Number(event.target.value) })} /></label>}
              </div>
              {settings.retrievalStrategy === "rerank" && <p className="rag-hint">بازرتبه‌بندی برای کار کردن ابتدا به نامزدهای بازیابی‌شده نیاز دارد؛ این مرحله به‌طور خودکار انجام می‌شود.</p>}
            </div>
          </section>
          <section className="rag-section" aria-labelledby="rag-chunk-title">
            <div className="rag-section-heading"><span className="admin-section-index">۰۲ / آماده‌سازی فایل‌ها</span><h2 id="rag-chunk-title">اندازهٔ قطعه‌ها</h2><p>فایل‌ها با روش بازگشتی LangChain و بر پایهٔ تعداد نویسه تقسیم می‌شوند. تغییر این دو مقدار، منابع آماده را دوباره پردازش می‌کند.</p></div>
            <div className="rag-config-grid rag-chunk-fields">
              <label><span>اندازهٔ هر قطعه</span><small>بازهٔ ۲۰۰ تا ۴۰۰۰ نویسه</small><input type="number" min="200" max="4000" step="1" value={settings.chunkSize} onChange={(event) => setSettings({ ...settings, chunkSize: Number(event.target.value) })} /></label>
              <label><span>هم‌پوشانی قطعه‌ها</span><small>بازهٔ ۰ تا ۱۰۰۰ نویسه؛ باید از اندازهٔ قطعه کمتر باشد.</small><input type="number" min="0" max={Math.min(1000, settings.chunkSize - 1)} step="1" value={settings.overlap} onChange={(event) => setSettings({ ...settings, overlap: Number(event.target.value) })} /></label>
            </div><p className="rag-hint">مقدار پیشنهادی: ۱۰۰۰ نویسه برای هر قطعه و ۱۵ نویسه هم‌پوشانی. پس از ذخیره، پاسخ‌ها فقط از منابع ثبت‌شده ساخته می‌شوند.</p>
          </section>
          <div className="rag-save-bar"><div><strong>{requiresReindex ? "بازسازی منابع لازم است" : "تنظیمات آمادهٔ ذخیره است"}</strong><small>{requiresReindex ? "پس از ذخیره، نسخهٔ تازهٔ قطعه‌ها ساخته می‌شود و تا تکمیل آن نسخهٔ قبلی فعال می‌ماند." : "تغییر راهبرد بازیابی بدون بازسازی فایل‌ها اعمال می‌شود."}</small></div><button type="submit" className="admin-primary" disabled={!dirty || Boolean(busy)}>{busy === "settings" ? "در حال ذخیره و بازسازی…" : "ذخیرهٔ تنظیمات"}</button></div>
        </form> : <p className="admin-loading">در حال دریافت تنظیمات…</p>}
      </>}
    </div>
  </main>;
}

