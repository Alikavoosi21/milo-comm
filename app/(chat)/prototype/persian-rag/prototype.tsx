"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";

type Variant = "a" | "b";
type Screen = "chat" | "sources" | "strategy" | "usage";
type Styles = Record<string, string>;

const variantNames: Record<Variant, string> = { a: "آرام و متمرکز", b: "میزکار دقیق" };
const screens: { id: Screen; label: string }[] = [
  { id: "chat", label: "گفتگو" },
  { id: "sources", label: "منابع دانش" },
  { id: "strategy", label: "راهبرد پاسخ" },
  { id: "usage", label: "گزارش مصرف" },
];

export function PersianRagPrototype({
  initialVariant,
  initialScreen,
  styles: s,
}: {
  initialVariant: Variant;
  initialScreen: Screen;
  styles: Styles;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(true);

  function navigate(nextVariant: Variant, nextScreen: Screen) {
    setVariant(nextVariant);
    setScreen(nextScreen);
    router.replace(`${pathname}?variant=${nextVariant}&screen=${nextScreen}`, { scroll: false });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHistoryOpen(false);
        setSectionsOpen(false);
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        navigate(variant === "a" ? "b" : "a", screen);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [variant, screen]);

  return (
    <main data-prototype-stage="true" className={`${s.prototypeStage} ${variant === "a" ? s.variantA : s.variantB}`} dir="rtl">
      <div className={s.prototypeTopline}>
        <div className={s.prototypeBrand}><BrandMark className={s.brandMark} /><span><b>MILO COMM</b><small>نمونهٔ طراحی · فقط نمایشی</small></span></div>
        <span className={s.prototypeBadge}>اطلاعات نمونه</span>
        <button className={s.historyToggle} aria-expanded={historyOpen} aria-controls={variant === "b" ? "workspace-navigation" : "prototype-sidebar"} onClick={() => setHistoryOpen((open) => !open)}>فهرست</button>
      </div>

      <div className={s.prototypeLayout}>
        {variant === "a" ? <SidebarA styles={s} screen={screen} open={historyOpen} sectionsOpen={sectionsOpen} onClose={() => setHistoryOpen(false)} onToggleSections={() => setSectionsOpen((open) => !open)} onNavigate={(nextScreen) => { setSectionsOpen(false); navigate(variant, nextScreen); }} /> : null}
        {variant === "b" ? <WorkspaceRail styles={s} screen={screen} open={historyOpen} sectionsOpen={sectionsOpen} onClose={() => setHistoryOpen(false)} onToggleSections={() => setSectionsOpen((open) => !open)} onNavigate={(nextScreen) => { setSectionsOpen(false); navigate(variant, nextScreen); }} /> : null}
        <section className={s.mainPanel}>
          {screen === "chat" && <ChatView variant={variant} styles={s} evidenceOpen={evidenceOpen} onToggleEvidence={() => setEvidenceOpen((open) => !open)} onOpenSources={() => navigate(variant, "sources")} />}
          {screen === "sources" && <SourcesView variant={variant} styles={s} />}
          {screen === "strategy" && <StrategyView variant={variant} styles={s} />}
          {screen === "usage" && <UsageView styles={s} />}
        </section>
        {variant === "b" && screen === "chat" && evidenceOpen ? <EvidenceRail styles={s} onClose={() => setEvidenceOpen(false)} /> : null}
      </div>

      <div className={s.variantBar} role="group" aria-label="مقایسهٔ نمونه‌های طراحی">
        <button aria-label="نمونهٔ قبلی" onClick={() => navigate(variant === "a" ? "b" : "a", screen)}>‹</button>
        <span><b>{variant.toUpperCase()}</b><span>{variantNames[variant]}</span><small>با کلیدهای ← و → هم جابه‌جا شوید</small></span>
        <button aria-label="نمونهٔ بعدی" onClick={() => navigate(variant === "a" ? "b" : "a", screen)}>›</button>
      </div>
      <div className={s.sampleNote}>این صفحه نمونهٔ تصمیم‌گیری است؛ هیچ پیام، تنظیم یا فایلی ذخیره نمی‌شود.</div>
    </main>
  );
}

function SidebarA({ styles: s, screen, open, sectionsOpen, onClose, onToggleSections, onNavigate }: { styles: Styles; screen: Screen; open: boolean; sectionsOpen: boolean; onClose(): void; onToggleSections(): void; onNavigate(screen: Screen): void }) {
  return <>
    {open && <button className={s.historyBackdrop} aria-label="بستن نوار کناری" onClick={onClose} />}
    <aside id="prototype-sidebar" className={`${s.sidebarA} ${open ? s.sidebarAOpen : ""}`}>
      <div className={s.railHeader}><b>گفتگوها</b><button className={s.historyClose} onClick={onClose} aria-label="بستن نوار کناری">×</button></div>
      <button className={s.newChat}>＋ <span>گفتگوی جدید</span></button>
      <label className={s.search}><span aria-hidden="true">⌕</span><input placeholder="جست‌وجو در گفتگوها" /></label>
      <div className={s.historyGroup}><small>امروز</small><button className={s.historyActive}>مرور سفر جنوب</button><button>پرسش دربارهٔ بیمه</button></div>
      <div className={s.historyGroup}><small>هفتهٔ گذشته</small><button>خلاصهٔ قرارداد</button><button>یادداشت‌های جلسه</button></div>
      <div className={s.railFooter}>
        <nav id="workspace-sections" className={s.sectionMenu} aria-label="بخش‌های برنامه" hidden={!sectionsOpen}>{screens.map((item) => <button key={item.id} className={screen === item.id ? s.navigationActive : ""} onClick={() => { onNavigate(item.id); onClose(); }}>{item.label}</button>)}</nav>
        <div className={s.historyRailBottom}><span className={s.avatar}>ک</span><span><b>کاربر مایلو</b><small>فضای شخصی</small></span></div>
        <div className={s.railFooterActions}><button onClick={() => { onNavigate("strategy"); onClose(); }}>تنظیمات</button><button aria-expanded={sectionsOpen} aria-controls="workspace-sections" onClick={onToggleSections}>بخش‌های برنامه</button></div>
      </div>
    </aside>
  </>;
}

function ChatView({ variant, styles: s, evidenceOpen, onToggleEvidence, onOpenSources }: { variant: Variant; styles: Styles; evidenceOpen: boolean; onToggleEvidence(): void; onOpenSources(): void }) {
  return <>
    <header className={s.pageHeader}><div><small>گفتگوی مستند</small><h1>مرور سفر جنوب</h1></div><div className={s.headerActions}><span className={s.statusPill}>۳ منبع آماده</span>{variant === "b" && <button className={s.evidenceToggle} aria-expanded={evidenceOpen} onClick={onToggleEvidence}>{evidenceOpen ? "شواهد · ۲" : "نمایش شواهد"}</button>}<button aria-label="گزینه‌های گفتگو">•••</button></div></header>
    <div className={s.chatScroll}>
      <div className={s.dayDivider}><span>امروز · ۲۸ شهریور</span></div>
      <article className={`${s.message} ${s.userMessage}`}><span className={s.avatar}>ش</span><div><small>شما <time>۱۰:۳۲</time></small><p>برای سفر سه روزه به شیراز چه جاهایی را پیشنهاد می‌کنی؟</p></div></article>
      <article className={s.message}><BrandMark className={s.assistantMark} /><div className={s.answerBody}><small>مایلو <time>پاسخ مستند</time></small><p>برای سه روز، می‌توانید برنامه را بین بافت تاریخی شهر، باغ‌ها و یک گشت کوتاه بیرون شهر تقسیم کنید:</p><ol><li><b>روز اول:</b> حافظیه، سعدیه و باغ جهان‌نما</li><li><b>روز دوم:</b> بازار وکیل، مسجد نصیرالملک و ارگ کریم‌خان</li><li><b>روز سوم:</b> تخت‌جمشید و نقش‌رستم، با زمان رفت‌وآمد کافی</li></ol>
        <div className={s.evidenceCard}><div><span className={s.evidenceIcon}>▤</span><span><b>۲ شاهد از منابع دانش</b><small>اطلاعات این پاسخ از منابع مدیر بازیابی شده</small></span><button onClick={onOpenSources}>دیدن منابع <span aria-hidden="true">←</span></button></div><div className={s.sourcePills}><span>راهنمای سفر جنوب.pdf · ص ۱۲</span><span>جاذبه‌های فارس.docx · ص ۴</span></div></div>
        <div className={s.messageActions}><button>کپی پاسخ</button><button>بازسازی پاسخ</button><button>مفید بود</button></div>
      </div></article>
      {variant === "b" && <article className={`${s.message} ${s.userMessage} ${s.followup}`}><span className={s.avatar}>ش</span><div><small>شما <time>۱۰:۳۴</time></small><p>برای بازدید از تخت‌جمشید چقدر زمان بگذارم؟</p></div></article>}
    </div>
    <div className={s.composerDock}><div className={s.composer}><textarea placeholder="پیامتان را بنویسید…" aria-label="متن پیام" /><div className={s.composerTools}><div><button aria-label="افزودن فایل">＋</button><button aria-label="ارجاع به گفتگو">↗</button><button onClick={onOpenSources}>منابع فعال <span>۳</span></button></div><button className={s.sendButton} aria-label="ارسال پیام">↑</button></div></div><small>Enter برای ارسال · Shift + Enter برای خط جدید · پاسخ بر پایهٔ منابع انتخاب‌شده</small></div>
  </>;
}

function EvidenceRail({ styles: s, onClose }: { styles: Styles; onClose(): void }) {
  return <aside id="evidence-rail" className={s.evidenceRail}><div className={s.railHeading}><small>زمینهٔ پاسخ</small><h2>شواهد گفتگو</h2><span>۲ منبع برای پاسخ بالا</span><button className={s.evidenceClose} onClick={onClose} aria-label="بستن پنل شواهد">×</button></div><article className={s.railSource}><span>PDF</span><div><b>راهنمای سفر جنوب</b><small>صفحهٔ ۱۲ · بخش شیراز</small></div><button aria-label="بازکردن منبع">↗</button></article><article className={s.railSource}><span>DOC</span><div><b>جاذبه‌های فارس</b><small>صفحهٔ ۴ · مکان‌های تاریخی</small></div><button aria-label="بازکردن منبع">↗</button></article><div className={s.railNotice}><b>دامنهٔ پاسخ</b><p>فقط از منابع مدیر</p><small>اگر شاهد کافی نباشد، مایلو پاسخ حدسی نمی‌سازد.</small></div></aside>;
}

function WorkspaceRail({ styles: s, screen, open, sectionsOpen, onClose, onToggleSections, onNavigate }: { styles: Styles; screen: Screen; open: boolean; sectionsOpen: boolean; onClose(): void; onToggleSections(): void; onNavigate(screen: Screen): void }) {
  return <>
    {open && <button className={s.historyBackdrop} aria-label="بستن نوار کناری" onClick={onClose} />}
    <aside id="workspace-navigation" className={`${s.workspaceRail} ${open ? s.workspaceRailOpen : ""}`} aria-label="ناوبری برنامه">
      <div className={s.railHeader}><b>{screen === "chat" ? "گفتگوها" : screens.find((item) => item.id === screen)?.label}</b><button className={s.historyClose} onClick={onClose} aria-label="بستن نوار کناری">×</button></div>
      {screen === "chat" ? <section className={s.workspaceHistory} aria-label="گفتگوها">
        <button className={s.newChat}>＋ <span>گفتگوی جدید</span></button>
        <label className={s.search}><span aria-hidden="true">⌕</span><input placeholder="جست‌وجو در گفتگوها" /></label>
        <div className={s.historyGroup}><small>امروز</small><button className={s.historyActive}>مرور سفر جنوب</button><button>پرسش دربارهٔ بیمه</button></div>
        <div className={s.historyGroup}><small>هفتهٔ گذشته</small><button>خلاصهٔ قرارداد</button><button>یادداشت‌های جلسه</button></div>
      </section> : <div className={s.adminRailSummary}><small>وضعیت مجموعهٔ دانش</small><b>۲ منبع آماده</b><span>۳ جایگاه مجاز</span></div>}
      <div className={s.railFooter}>
        <nav id="workspace-sections" className={s.sectionMenu} aria-label="بخش‌های برنامه" hidden={!sectionsOpen}>{screens.map((item) => <button key={item.id} className={screen === item.id ? s.navigationActive : ""} onClick={() => { onNavigate(item.id); onClose(); }}>{item.label}</button>)}</nav>
        <div className={s.historyRailBottom}><span className={s.avatar}>ک</span><span><b>کاربر مایلو</b><small>فضای شخصی</small></span></div>
        <div className={s.railFooterActions}><button onClick={() => { onNavigate("strategy"); onClose(); }}>تنظیمات</button><button aria-expanded={sectionsOpen} aria-controls="workspace-sections" onClick={onToggleSections}>بخش‌های برنامه</button></div>
      </div>
    </aside>
  </>;
}

function SourcesView({ variant, styles: s }: { variant: Variant; styles: Styles }) {
  return <>
    <header className={s.pageHeader}><div><small>مدیریت دانش <span className={s.breadcrumb}>/ منابع فعال</span></small><h1>کتابخانهٔ دانش</h1></div><div className={s.headerActions}><span className={s.statusPill}>۲ از ۳ جایگاه</span><button className={s.primaryButton}>＋ افزودن منبع</button></div></header>
    <section className={s.adminIntro}><p>فایل‌هایی که پاسخ‌های مایلو به آن‌ها تکیه می‌کنند.</p><div className={s.filterRow}><label className={s.search}><span>⌕</span><input placeholder="جست‌وجوی نام فایل" /></label><button className={s.filterButton}>همهٔ وضعیت‌ها⌄</button></div></section>
    <div className={variant === "a" ? s.sourceListA : s.sourceListB}>
      <SourceRow styles={s} name="راهنمای سفر جنوب.pdf" meta="PDF · ۲۵۸ کیلوبایت · نسخهٔ ۲" status="آماده" />
      <SourceRow styles={s} name="جاذبه‌های فارس.docx" meta="DOCX · ۱۹۵ کیلوبایت · نسخهٔ ۱" status="آماده" />
      <div className={s.sourceEmpty}><span>＋</span><div><b>یک جایگاه خالی دارید</b><small>فایل PDF، DOCX، TXT، MD یا CSV تا ۱۰ مگابایت</small></div><button>افزودن منبع</button></div>
    </div>
    <p className={s.privacyNote}>منابع فقط برای پاسخ‌های همین مجموعهٔ دانش استفاده می‌شوند.</p>
  </>;
}

function SourceRow({ styles: s, name, meta, status }: { styles: Styles; name: string; meta: string; status: string }) {
  return <article className={s.sourceRow}><span className={s.fileBadge}>▤</span><div className={s.sourceInfo}><b>{name}</b><small>{meta}</small></div><span className={s.readyStatus}><i />{status}</span><button className={s.rowMore}>•••</button></article>;
}

function StrategyView({ variant, styles: s }: { variant: Variant; styles: Styles }) {
  return <>
    <header className={s.pageHeader}><div><small>مدیریت دانش <span className={s.breadcrumb}>/ رفتار پاسخ</span></small><h1>مایلو چطور پاسخ می‌دهد؟</h1></div><span className={s.statusPill}>تنظیمات ذخیره‌شده</span></header>
    <section className={s.adminIntro}><p>روش را بر اساس نوع پرسش‌ها انتخاب کنید. مایلو فقط وقتی پاسخ می‌دهد که شواهد کافی پیدا کند.</p></section>
    <div className={variant === "a" ? s.strategyStack : s.strategyGrid}>
      <label className={`${s.strategyOption} ${variant === "a" ? s.strategySelectedA : s.strategySelectedB}`}><input type="radio" name="strategy" defaultChecked /><span className={s.radioMark} /><span><b>RAG دو مرحله‌ای</b><small>ابتدا گزینه‌های مرتبط پیدا و سپس دقیق‌تر مرتب می‌شوند.</small></span><em>پیشنهاد برای پاسخ دقیق</em></label>
      <label className={s.strategyOption}><input type="radio" name="strategy" /><span className={s.radioMark} /><span><b>بازیابی گسترده</b><small>تعداد بیشتری از بخش‌های مرتبط وارد پاسخ می‌شوند.</small></span><em>برای مرور کلی</em></label>
      <label className={s.strategyOption}><input type="radio" name="strategy" /><span className={s.radioMark} /><span><b>۴ نتیجهٔ برتر</b><small>چند شاهد مرتبط انتخاب می‌شوند تا پاسخ متمرکز بماند.</small></span><em>برای پرسش مشخص</em></label>
    </div>
    <section className={s.settingsSection}><div><small>تنظیمات روش انتخاب‌شده</small><h2>میزان جست‌وجو</h2><p>این اعداد مشخص می‌کنند مایلو چند بخش از فایل‌ها را بررسی کند.</p></div><div className={s.numberSettings}><label><span>بخش‌های بررسی‌شده</span><small>نامزدهای اولیه</small><input defaultValue="۱۶" /></label><label><span>شاهدهای پاسخ</span><small>پس از بررسی ارتباط</small><input defaultValue="۴" /></label></div><details className={s.advanced}><summary>تنظیمات پیشرفتهٔ آماده‌سازی فایل</summary><p>تغییر این مقدارها منابع آماده را دوباره پردازش می‌کند.</p><div className={s.numberSettings}><label><span>اندازهٔ هر بخش</span><input defaultValue="۱۵۰۰ نویسه" /></label><label><span>هم‌پوشانی دو بخش</span><input defaultValue="۳۱ نویسه" /></label></div></details></section>
    <footer className={s.saveBar}><span><b>همهٔ تغییرها ذخیره شده‌اند</b><small>تغییر راهبرد، فایل‌ها را دوباره پردازش نمی‌کند.</small></span><button className={s.primaryButton} disabled>ذخیرهٔ تنظیمات</button></footer>
  </>;
}

function UsageView({ styles: s }: { styles: Styles }) {
  return <>
    <header className={s.pageHeader}><div><small>مدیریت دانش <span className={s.breadcrumb}>/ گزارش مصرف</span></small><h1>مصرف مدل</h1></div><button className={s.filterButton}>۳۰ روز گذشته⌄</button></header>
    <section className={s.metricsGrid}><article><small>درخواست پاسخ</small><b>۱٬۲۸۴</b><span>در ۳۰ روز گذشته</span></article><article><small>توکن ورودی</small><b>۸۴۲ هزار</b><span>شامل زمینه و پرسش</span></article><article><small>توکن خروجی</small><b>۲۱۸ هزار</b><span>پاسخ و خلاصه‌سازی</span></article><article><small>برآورد هزینه</small><b>—</b><span>نرخ قیمت‌گذاری تعریف نشده</span></article></section>
    <section className={s.usageChart}><div><b>روند درخواست‌ها</b><small>نمایش نمونه · بدون دادهٔ واقعی</small></div><div className={s.chartBars}>{[36,56,43,70,53,83,62,48,75,58,91,67].map((height,index)=><i key={index} style={{height:`${height}%`}} />)}</div><div className={s.chartLabels}><span>۱ شهریور</span><span>۱۵ شهریور</span><span>۲۸ شهریور</span></div></section>
    <p className={s.privacyNote}>گزارش مصرف متن خام گفتگو یا محتوای منابع را نشان نمی‌دهد.</p>
  </>;
}
