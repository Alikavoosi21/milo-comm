---
description: "فهرست اجرایی کارهای پیاده‌سازی چت‌بات RAG"
---

# Tasks: چت‌بات پاسخ‌گو بر پایهٔ منابع

**Input**: مستندات طراحی در /specs/003-grounded-rag-chatbot/

**Prerequisites**: plan.md و spec.md؛ همچنین research.md، data-model.md و contracts/rag-admin-chat-api.yaml

**Tests**: کارهای تست درج شده‌اند چون constitution نسخهٔ 1.1.0 پروژه آزمون خودکار در بالاترین مرز عملی را برای هر تغییر معنادار الزامی می‌کند. آزمون‌های خودکار و کنترل‌های نهایی در مرحلهٔ پیاده‌سازی اجرا شده‌اند.

**Organization**: کارها بر اساس سه user story مشخصات گروه‌بندی شده‌اند. پیاده‌سازی از مسیرهای واقعی App Router، lib، drizzle و tests همین repository استفاده می‌کند.

## Phase 1: Setup

**Purpose**: آماده‌کردن پیکربندی وابستگی و محیط پیش از ساخت قابلیت.

- [X] T001 افزودن پکیج‌های سازگار LangChain.js شامل @langchain/core، @langchain/openai، @langchain/textsplitters، @langchain/pgvector و @langchain/cohere به package.json و قفل‌کردن نسخه‌های resolveشده در package-lock.json
- [X] T002 افزودن schema تنظیمات سمت‌سرور برای EMBEDDING_BASE_URL، EMBEDDING_API_KEY، EMBEDDING_MODEL، RERANK_API_KEY، RERANK_MODEL، ADMIN_PASSWORD، ADMIN_SESSION_SECRET، آستانه‌های RAG/memory و نرخ‌های قیمت در lib/validation/env.ts و مستندسازی placeholderها در .env.example؛ secret واقعی وارد مخزن نشود
- [X] T003 پیش از تغییر کد App Router، راهنمای نسخهٔ نصب‌شده را در node_modules/next/dist/docs/ بخوانید و مسیرهای Route Handler/Server Component feature را با همان مستندات تطبیق دهید؛ قواعد ریشهٔ AGENTS.md را رعایت کنید

---

## Phase 2: Foundational

**Purpose**: زیرساخت مشترکی که لازم است پیش از user storyها آماده شود.

- [X] T004 افزودن migration فعال‌سازی افزونهٔ vector در drizzle/0002_enable_pgvector.sql و اطمینان از اجرای آن از مسیر migrate موجود در lib/db/migrate.ts
- [X] T005 تعریف interfaceهای قابل‌جایگزینی embedding، vector search، reranking و clock/usage در lib/rag/provider-ports.ts تا پیاده‌سازی storyها بتواند از fake adapter در آزمون استفاده کند
- [X] T006 تعریف شکل خطاهای قابل‌بازیابی و پاسخ‌های فارسی برای وضعیت‌های ingest و provider در lib/rag/errors.ts با رعایت نمایش ندادن stack، credential یا متن خام

**Checkpoint**: وابستگی‌ها و پیکربندی آماده‌اند؛ هر story از آداپترهای قابل تزریق و خطاهای مشترک استفاده می‌کند.

---

## Phase 3: User Story 1 - آماده‌سازی منابع معتبر (Priority: P1) 🎯

**Goal**: ادمین احراز هویت‌شده بتواند تا سه فایل مشترک اضافه/مشاهده/حذف/جایگزین کند و وضعیت آماده‌سازی را ببیند.

**Independent Test**: با fake embedding/vector store ادمین سه فایل مجاز می‌افزاید، آماده‌شدن را می‌بیند، منبع چهارم رد می‌شود، منبع حذف‌شده ظرفیت آزاد می‌کند و شکست جایگزینی نسخهٔ سالم قبلی را فعال نگه می‌دارد. درخواست بدون نشست ادمین هیچ منبعی را نمی‌خواند یا تغییر نمی‌دهد.

### Tests for User Story 1

- [X] T007 [P] [US1] افزودن آزمون‌های contract برای login، فهرست، افزودن، جایگزینی، حذف، سقف سه منبع و پاسخ‌های 401/409/422 مطابق contracts/rag-admin-chat-api.yaml در tests/contract/admin-sources-api.test.ts
- [X] T008 [P] [US1] افزودن آزمون یکپارچهٔ ingest با fake extractor/vector store برای فایل سالم، فایل نامعتبر، شکست embedding و حفظ نسخهٔ فعال قبلی در tests/integration/knowledge-source-ingestion.test.ts

### Implementation for User Story 1

- [X] T009 [US1] تعریف KnowledgeSource با «حداکثر سه منبع فعال یا در حال آماده‌سازی»، status برابر «processing | ready | failed | replacing»، و activeVersion در lib/db/schema/knowledge.ts و افزودن migration drizzle/0003_knowledge_sources.sql؛ sourceName، sourceVersion، chunkIndex و page را در metadata قطعه‌ها نگه دارید
- [X] T010 [US1] پیاده‌سازی نشست ادمین زمان‌دار با cookieهای HttpOnly و SameSite=Lax و Secure در production، verifier رمز از env و مقایسهٔ زمان‌ثابت در lib/auth/admin-session.ts و lib/auth/require-admin.ts؛ endpointهای POST/DELETE نشست را در app/api/admin/session/route.ts بسازید
- [X] T011 [US1] پیاده‌سازی ingest در lib/rag/source-service.ts با فایل موقت، اعتبارسنجی PDF/DOCX/TXT/MD/CSV تا ۱۰ مگابایت، extraction موجود در lib/files/extraction.ts، وضعیت‌های پردازش و فعال‌سازی اتمیک؛ در شکست جایگزینی «نسخهٔ فعال و سالم قبلی تا زمان موفقیت نسخهٔ جدید حفظ شود»
- [X] T012 [US1] ساخت GET/POST فهرست و افزودن در app/api/admin/sources/route.ts و PUT/DELETE در app/api/admin/sources/[sourceId]/route.ts؛ هر درخواست باید نشست ادمین را server-side بررسی کند و limit سه منبع را در برابر درخواست هم‌زمان حفظ کند
- [X] T013 [P] [US1] ساخت پنل فارسی RTL در app/(admin)/admin/page.tsx و components/admin/knowledge-sources.tsx با نام فایل، شمار ظرفیت از سه، وضعیت آماده‌سازی، خطای قابل‌فهم، حذف/جایگزینی و نمایش نوع‌های پذیرفته‌شده و سقف ۱۰ مگابایت
- [X] T014 [US1] افزودن آزمون E2E پنل ادمین برای ورود، افزودن سه فایل، رد چهارمی، حذف، جایگزینی موفق/ناموفق و پیمایش صفحه‌کلید در tests/e2e/admin-sources.spec.ts

**Checkpoint**: story مدیریت منابع با adapterهای fake و مسیر مستقل /admin قابل ارزیابی است.

---

## Phase 4: User Story 2 - دریافت پاسخ مستند به منابع (Priority: P1)

**Goal**: پاسخ فقط با شواهد sourceهای فعال ساخته شود؛ منبع پاسخ مشخص و متن بی‌پاسخی دقیق باشد.

**Independent Test**: روی مجموعهٔ سه‌منبعی آزمون‌شده، پرسش دارای پاسخ با citation معتبر بازمی‌گردد؛ پرسش خارج از منابع دقیقاً «متاسفانه خواسته شما در منابع تعیین شده وجود ندارد، لطفا منبع مناسب این سوال رو وارد کنید» را نمایش می‌دهد و هیچ ادعای دانشی اضافه نمی‌کند.

**Dependencies**: T009 و T011–T012 برای sourceهای آماده لازم‌اند؛ آزمون unit این story می‌تواند ابتدا با fake retriever نوشته شود.

### Tests for User Story 2

- [X] T015 [P] [US2] افزودن آزمون‌های واحد retrieval و evidence gate شامل فیلتر sourceهای ready/version فعال، رد امتیاز زیر threshold، prompt injection در پیام/فایل و متن fallback دقیق در tests/unit/rag-grounding.test.ts
- [X] T016 [P] [US2] افزودن آزمون contract برای پیام گفتگو، citation منبع و حفظ پیام کاربر در خطای قابل‌بازیابی در tests/contract/grounded-chat-api.test.ts

### Implementation for User Story 2

- [X] T017 [US2] ساخت splitter در lib/rag/chunking.ts با RecursiveCharacterTextSplitter، «chunkOverlap دقیقاً ۱۵ کاراکتر» و chunk size آغازین ۱۰۰۰ نویسه؛ برای هر قطعه sourceId، sourceName، sourceVersion، chunkIndex و page موجود را به metadata اضافه کنید
- [X] T018 [US2] ساخت embedding و PGVectorStore در lib/rag/vector-store.ts با مدل/endpoint پیکربندی‌شده؛ بردارهای همهٔ chunkها و query باید «ابعاد یکسان» داشته باشند و metadata فقط به sourceهای ready و version فعال اجازهٔ جست‌وجو دهد
- [X] T019 [US2] پیاده‌سازی broad retrieval در lib/rag/retrieval.ts با 12 candidate آغازین، vector score و فیلتر نسخهٔ فعال؛ مقادیر candidate count و relevance threshold باید از env قابل تنظیم باشند
- [X] T020 [US2] پیاده‌سازی LangChain CohereRerank adapter در lib/rag/reranker.ts با مدل چندزبانهٔ env، نگاشت نتایج به chunkهای اصلی و بازگرداندن «حداکثر چهار chunk»؛ خطای provider نباید بی‌صدا به مدل پاسخ برود
- [X] T021 [US2] پیاده‌سازی پاسخ ساختاریافته در lib/rag/answer-chain.ts با temperature=0، فقط evidenceهای rerankشده، عدم اعتماد به دستورهای پیام/منبع و citationهای مبتنی بر شناسه/metadata قطعه؛ نبود منبع یا شاهد کافی باید متن fallback spec را بدون متن تولیدی دیگر برگرداند
- [X] T022 [US2] اتصال pipeline به app/api/conversations/[conversationId]/messages/route.ts و lib/chat/generation-service.ts؛ پاسخ و citation را فقط پس از اعتبارسنجی کامل grounding وارد stream کنید و پیام کاربر/خطای فارسی قابل‌بازیابی را حفظ کنید
- [X] T023 [P] [US2] نمایش citationهای قابل‌دسترسی و نام source زیر پاسخ در components/chat/source-citations.tsx و اتصال آن به components/chat/chat-screen.tsx
- [X] T024 [US2] افزودن آزمون integration و E2E برای پاسخ دارای منبع، پاسخ بی‌پاسخ دقیق، تزریق دستور داخل سند، خطای provider و عدم ورود خلاصهٔ حافظه به evidence در tests/integration/grounded-chat.test.ts و tests/e2e/grounded-chat.spec.ts

**Checkpoint**: مسیر کاربر برای پاسخ مستند و fallback مستقل قابل سنجش است؛ موفقیت باید معیارهای SC-003 و SC-004 را روی مجموعهٔ ارزیابی spec گزارش کند.

---

## Phase 5: User Story 3 - تداوم گفتگو و مشاهدهٔ مصرف (Priority: P2)

**Goal**: با پرشدن حافظه، بخش قدیمی گفتگو خلاصه و از context فعال هرس شود؛ ادمین token/cost را بدون متن خام ببیند.

**Independent Test**: گفتگوی طولانی از threshold عبور می‌کند، نکتهٔ قدیمی در ادامه قابل بازیابی است، متن اصلی transcript باقی می‌ماند، گفتگوی دیگر خلاصه را نمی‌بیند، و usage report عملیات/model/token/cost یا unknown را بدون متن خام نشان می‌دهد.

**Dependencies**: مدل گفتگو از Phase 2 و رخدادهای فراخوانی provider از US1/US2؛ تست‌های memory و cost با fake model مستقل اجرا می‌شوند.

### Tests for User Story 3

- [X] T025 [P] [US3] افزودن آزمون واحد برای threshold خلاصه‌سازی، checkpoint، حفظ ۸ پیام اخیر، scope مستقل هر گفتگو، شکست summarizer و تخمین/unknown بودن token در tests/unit/conversation-memory.test.ts
- [X] T026 [P] [US3] افزودن آزمون یکپارچه‌سازی گزارش مصرف برای answer/summarize/embed/rerank، محاسبه با نرخ تنظیم‌شده، cost نامشخص و ممنوعیت ذخیرهٔ متن/credential در tests/integration/usage-privacy.test.ts

### Implementation for User Story 3

- [X] T027 [US3] افزودن summary، summarizedThroughMessageId و summaryUpdatedAt به Conversation در lib/types.ts و loader/persistence در lib/db/repositories/memory-store.ts؛ دادهٔ قدیمی باید با summary=null hydrate شود و پیام‌های transcript تغییر نکنند
- [X] T028 [US3] ساخت سرویس lib/memory/summary-service.ts با آستانهٔ آغازین ۱۲٬۰۰۰ token، خلاصهٔ حدود ۱٬۰۰۰ token و نگهداری ۸ پیام تازه؛ خلاصه فقط هدف‌ها، واقعیت‌های گفته‌شده و موضوع‌های باز را نگه دارد و با temperature=0 تولید شود
- [X] T029 [US3] اتصال middleware خلاصه‌سازی/pruning به lib/chat/context-builder.ts و lib/chat/generation-service.ts؛ خلاصه و پیام‌های تازه فقط از همان conversation بیایند، هرگز RAG evidence نشوند و در شکست متن ثبت‌شدهٔ کاربر حذف نشود
- [X] T030 [US3] تعریف UsageEvent با operation برابر «answer | summarize | embed | rerank»، tokenها، estimated، nullable cost/currency، duration، status و errorCategory در lib/db/schema/usage.ts و migration drizzle/0004_usage_events.sql؛ رکورد نباید prompt، پاسخ، نام فایل، متن chunk، API key یا دادهٔ شناسایی داشته باشد
- [X] T031 [US3] ساخت middleware ثبت مصرف و محاسبهٔ هزینه در lib/observability/cost-logger.ts و اتصال به lib/model/openai-compatible.ts و adapterهای embedding/rerank؛ usage واقعی provider بر تخمین مقدم باشد و بدون نرخ تنظیم‌شده «cost نامشخص» ثبت شود
- [X] T032 [US3] ساخت GET گزارش ادمین در app/api/admin/usage/route.ts با فیلتر زمان/operation/model و تجمیع token و cost؛ احراز نشست ادمین و عدم بازگرداندن متن خام را رعایت کنید
- [X] T033 [P] [US3] ساخت نمای گزارش مصرف فارسی RTL و فیلترهای زمان/نوع عملیات در components/admin/usage-report.tsx و app/(admin)/admin/usage/page.tsx؛ token تخمینی و cost نامشخص باید مشخص باشند
- [X] T034 [US3] افزودن آزمون E2E عبور از آستانهٔ حافظه، پیوستگی پس از summary، جدایی دو گفتگو و مشاهدهٔ usage privacy-safe در tests/e2e/memory-and-usage.spec.ts

**Checkpoint**: معیارهای SC-005، SC-006 و SC-007 با fake adapters و سناریوی UI قابل اندازه‌گیری‌اند.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: یکپارچه‌سازی مسیرها، فارسی‌سازی و ایمنی سراسر feature.

- [X] T035 [P] بازبینی صفحه‌کلید، RTL، viewportهای 1440×900 و 390×844، وضعیت‌های loading/empty/error و کنتراست بخش‌های جدید در tests/e2e/accessibility.spec.ts و app/globals.css
- [X] T036 [P] تکمیل تنظیمات، جریان داده، هزینهٔ providerها و محدودیت استقرار single-instance در specs/003-grounded-rag-chatbot/quickstart.md و .env.example
- [X] T037 اجرای typecheck، lint، suiteهای unit/contract/integration، build و E2E طبق specs/003-grounded-rag-chatbot/quickstart.md و رفع مواردی که به feature مربوط‌اند

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: شروع فوری؛ T001 و T002 روی فایل‌های جدا هستند و قابل انجام موازی‌اند. T003 باید پیش از تغییر App Router کامل شود.
- **Foundational (Phase 2)**: بعد از setup؛ برای تمام storyها لازم است.
- **US1 (Phase 3)**: پس از Phase 2؛ نخستین بخش قابل نمایش ادمین.
- **US2 (Phase 4)**: از نظر unit با fake قابل توسعه است، اما end-to-end به source service آمادهٔ US1 وابسته است.
- **US3 (Phase 5)**: schema memory می‌تواند مستقل باشد، اما usage end-to-end به provider calls در US1 و US2 وابسته است.
- **Polish (Phase 6)**: پس از storyهای انتخاب‌شده؛ T037 در پایان و پس از ادغام تغییرها.

### User Story Dependencies

- **US1 (P1)**: بدون وابستگی story؛ منبع دانشی و نشست ادمین را فراهم می‌کند.
- **US2 (P1)**: برای جریان کامل به US1 وابسته است؛ retrieval/grounding unit tests با fake adapter قابل شروع مستقل‌اند.
- **US3 (P2)**: حافظه به conversation موجود متکی است؛ ثبت usage کامل به عملیات provider در US1 و US2 وابسته است. گزارش دسترسی ادمین از نشست US1 استفاده می‌کند.

### Parallel Opportunities

- T001 با T002 قابل موازی است؛ T003 پیش از تغییر کد اجرا شود.
- T007 و T008 قابل موازی‌اند؛ پیاده‌سازی T009–T012 به ترتیب schema → service → endpoints انجام شود. T013 پس از قرارداد UI/API می‌تواند با تست‌های integration موازی جلو برود.
- T015 و T016 قابل موازی‌اند؛ T017 و T018 روی فایل‌های جدا بعد از provider-portها قابل موازی‌اند. T019 → T020 → T021 → T022 وابستگی ترتیبی دارد. T023 پس از تعیین شکل citationها قابل انجام است.
- T025 و T026 موازی‌اند؛ T027 → T028 → T029 مسیر memory است و T030 → T031 → T032 مسیر usage. پس از آماده‌شدن API، T033 با تکمیل آزمون یکپارچه موازی‌پذیر است.
- هیچ taskی با [P] به تغییر هم‌زمان همان فایل task موازی دیگری نیاز ندارد.

### Parallel Example: User Story 1

- اجرای T007 و T008 در دو فایل آزمون مستقل.
- پس از T009، T011 (service) و توسعهٔ اولیهٔ T013 (UI با API mock) را می‌توان جدا پیش برد؛ اتصال نهایی UI به T012 وابسته است.

### Implementation Strategy

#### MVP قابل‌نمایش
1. Phase 1 و Phase 2 را کامل کنید.
2. Phase 3 را کامل کنید تا ادمین منابع را مدیریت کند.
3. Phase 4 را اضافه کنید تا مسیر کاربر از پرسش تا پاسخ مستند کامل شود؛ این دو story با هم MVP محصول را می‌سازند.
4. معیارهای SC-001 تا SC-004 را بررسی کنید.
5. Phase 5 را برای حافظهٔ طولانی و گزارش مصرف اضافه کنید و سپس معیارهای SC-005 تا SC-008 را بررسی کنید.

#### تحویل تدریجی
- ابتدا آزمون‌های هر story را با adapterهای fake بسازید.
- US1 را به‌عنوان checkpoint مستقل تحویل دهید.
- US2 را به retrieval واقعی، reranking، grounding و citation وصل کنید.
- US3 را روی رخدادهای واقعی همان pipeline اضافه کنید.
- در پایان T035–T037 را انجام دهید؛ provider واقعی برای آزمون خودکار لازم نیست.

---

## Notes

- هر task قابل اجراست و مسیر فایل صریح دارد.
- [P] فقط برای فایل‌های جدا با پیش‌نیازهای کامل درج شده است.
- [US1]/[US2]/[US3] به همان شماره‌گذاری spec.md اشاره می‌کنند.
- تست‌های خودکار از fake provider استفاده می‌کنند؛ اتصال credential واقعی در quickstart دستی بررسی می‌شود.
- پیش از taskهای کدنویسی App Router، T003 و مستندات نسخهٔ نصب‌شدهٔ Next.js ملاک‌اند.

## گزارش اجرای پیاده‌سازی

- اجرای `npm run typecheck`، `npm run lint`، `npm test` (۵۴ آزمون)، `npm run build` و `npm run test:e2e` (۲۸ آزمون دسکتاپ و موبایل) موفق بود.
- مسیرهای پیاده‌سازی برخی taskها در ساختار نهایی ادغام شده‌اند: بازیابی در `lib/rag/vector-store.ts`، ثبت مصرف در `lib/observability/usage.ts`، رابط مدیریت در `components/admin/admin-dashboard.tsx` و middleware حافظه در `lib/memory/summary-service.ts` و routeهای گفتگو است.
- اتصال واقعی PostgreSQL، embedding و Cohere به credentials محیط مقصد وابسته است و در آزمون‌های خودکار با حالت محلی جایگزین شده است.

