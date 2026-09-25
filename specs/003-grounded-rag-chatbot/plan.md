# Implementation Plan: چت‌بات پاسخ‌گو بر پایهٔ منابع

**Branch**: `003-grounded-rag-chatbot` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: مشخصات فارسی در `specs/003-grounded-rag-chatbot/spec.md`

## Summary

در برنامهٔ Next.js فعلی، پنل ادمین برای مدیریت سه فایل دانشی و گزارش مصرف، و جریان گفتگوی کاربر مبتنی بر RAG افزوده می‌شود. استخراج‌گر فایل موجود حفظ می‌شود؛ متن استخراج‌شده با splitter لنگ‌چین و هم‌پوشانی ۱۵ نویسه قطعه‌بندی، با embedding سازگار با OpenAI بردارسازی، در PostgreSQL/pgvector ذخیره، و در هر پرسش به‌صورت بازیابی گسترده و سپس بازرتبه‌بندی تخصصی تا چهار قطعه رتبه‌بندی می‌شود. تولید نهایی با دمای صفر فقط شواهد برگزیده را می‌گیرد و نبود شواهد کافی به متن ثابت spec ختم می‌شود. حافظهٔ کوتاه‌مدت هر گفتگو با عبور از آستانهٔ توکن خلاصه می‌شود؛ پیام‌های اصلی برای transcript حفظ می‌شوند و فقط متن قدیمی از زمینهٔ فعال هرس می‌شود.

## Technical Context

**Language/Version**: TypeScript؛ Node.js 24.19.0 در محیط فعلی؛ Next.js 16.3.5 و React 19.3.0 در lockfile کپی مبنا.

**Primary Dependencies**: Next.js App Router، Drizzle ORM، `pg`، LangChain.js (`@langchain/core`, `@langchain/openai`, `@langchain/textsplitters`, `@langchain/pgvector`, `@langchain/cohere`)، و استخراج‌گرهای موجود (`pdf-parse`, `mammoth`, `papaparse`). نسخه‌های LangChain هنگام پیاده‌سازی با هم سازگار و در lockfile قفل شوند.

**Storage**: PostgreSQL موجود با افزونهٔ pgvector برای منبع‌های دانشی، متادیتای قطعه‌ها و embeddingها؛ فایل‌های آپلودشده در `STORAGE_DIR` موجود؛ مکالمه‌ها و خلاصهٔ حافظه در repository فعلی تا زمان تصمیم جداگانه دربارهٔ مهاجرت ذخیره‌سازی. هم‌زمانی این repository فایل‌محور برای یک نمونهٔ برنامه در نظر گرفته شده است.

**Testing**: Vitest برای واحد/قرارداد/یکپارچه‌سازی؛ Playwright برای جریان‌های کامل؛ mock آداپترهای مدل، embedding و reranker برای اجرای قطعی.

**Target Platform**: برنامهٔ وب Next.js، سرور Node.js، مرورگرهای دسکتاپ و موبایل با رابط فارسی RTL.

**Project Type**: برنامهٔ full-stack تک‌مخزنی Next.js App Router.

**Performance Goals**: آماده‌سازی هر فایل تا ۱۰MB بدون پردازش درخواست چت؛ محدودکردن زمینهٔ مدل به چهار قطعهٔ رتبه‌بندی‌شده به‌علاوهٔ حافظهٔ اخیر؛ بازگشت پاسخ یا خطای قابل‌بازیابی با وضعیت قابل‌مشاهده.

**Constraints**: حداکثر سه منبع فعال مشترک؛ PDF/DOCX/TXT/MD/CSV؛ chunk overlap دقیقاً ۱۵ نویسه؛ پاسخ temperature=0؛ top-4 پس از rerank؛ کلیدها فقط در سرور؛ لاگ بدون متن خام؛ pgvector و ارائه‌دهندهٔ embedding باید بردارهای یکسان‌بعد تولید کنند. provider فعلی چت OpenAI-compatible است؛ پشتیبانی endpoint embedding آن باید در پیکربندی بررسی شود، وگرنه تنظیمات embedding مستقل لازم است. فایل‌سیستم محلی و repository JSON فعلی برای استقرار چندنمونه‌ای نیازمند تصمیم معماری بعدی هستند.

**Scale/Scope**: MVP برای یک مجموعهٔ مشترک سه‌منبعی، یک گروه ادمین و گفتگوهای مستقل کاربران؛ بدون چندمستاجری، عامل، صف پس‌زمینه یا ingestion زمان‌بندی‌شده.

## Constitution Check

*Gate before Phase 0: PASS.*

- I: همهٔ مسیرهای پنل، خطاها و وضعیت‌های بارگذاری فارسی و RTL؛ کنترل‌ها با صفحه‌کلید.
- II: خلاصه و تاریخچه فقط به گفتگوی جاری تعلق دارند؛ فقط منبع فعال وارد evidence می‌شود.
- III: اعتبارسنجی نوع/حجم سمت سرور؛ کلیدهای مدل/embedding/rerank فقط در سرور؛ telemetry فاقد متن خام.
- IV: App Router و TypeScript حفظ می‌شوند؛ RAG، ingest، memory، logging و provider adapters ماژولار می‌مانند.
- V: وضعیت ingest و generation و خطاهای قابل‌بازیابی در UI نمایش داده می‌شوند.
- Platform/security: admin session مجزا، دسترسی ادمین در همهٔ routeهای مدیریتی بررسی می‌شود، upload با فایل موقت و فعال‌سازی اتمیک انجام می‌شود.
- Quality: قراردادهای model/retriever/storage با fake adapter آزمون می‌شوند؛ جریان‌های اصلی با E2E بررسی خواهند شد.

**بازبینی پس از Phase 1: PASS.** مدل داده و API پیشنهادی حریم خصوصی، مالکیت گفتگو و اتمیک‌بودن جایگزینی منبع را حفظ می‌کنند. هیچ استثنای قانون اساسی لازم نیست.

## Project Structure

### Documentation (this feature)

```text
specs/003-grounded-rag-chatbot/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rag-admin-chat-api.yaml
└── tasks.md                         # مرحلهٔ بعد، پس از بازبینی plan
```

### Source Code (repository root)

```text
app/
├── (admin)/admin/page.tsx
├── api/admin/session/route.ts
├── api/admin/sources/route.ts
├── api/admin/sources/[sourceId]/route.ts
├── api/admin/usage/route.ts
├── api/conversations/[conversationId]/messages/route.ts
└── (chat)/...
components/
├── admin/                           # منابع، وضعیت آماده‌سازی، گزارش مصرف
└── chat/                            # نمایش پاسخ و ارجاع منبع
lib/
├── auth/                            # نشست و الزام admin
├── rag/                             # ingest، splitter، vector store، retrieval، rerank، پاسخ مستند
├── memory/                          # شمارش، خلاصه‌سازی و ساخت زمینهٔ کوتاه‌مدت
├── observability/                   # رویداد مصرف و برآورد هزینه
├── model/                           # آداپتر چت/embedding/rerank
├── db/schema/                       # منبع‌های دانشی و رویدادهای مصرف
└── validation/                      # ورودی‌های API و تنظیمات server-only
drizzle/                             # migration برای pgvector، منبع‌ها و مصرف
tests/{unit,contract,integration,e2e}/
```

**Structure Decision**: گسترش برنامهٔ full-stack تک‌مخزنی موجود. Route Handlers نازک می‌مانند؛ سرویس‌های `lib/rag`, `lib/memory` و `lib/observability` قواعد دامنه را نگه می‌دارند. منطق provider از UI جدا می‌شود. فایل آپلود ابتدا موقت ذخیره و استخراج/بردارسازی می‌شود؛ فقط پس از موفقیت، نسخهٔ جدید فعال و قبلی پاک‌سازی می‌شود.

## Complexity Tracking

هیچ نقض قانون اساسی یا پروژهٔ موازی جدید لازم نیست. pgvector و reranker تخصصی تنها وابستگی‌های افزوده‌شدهٔ معماری هستند: اولی برای جست‌وجوی معنایی پایدار در سه منبع، دومی برای مرتب‌سازی دقیق فارسی و کاهش زمینهٔ ارسالی به مدل نهایی.
