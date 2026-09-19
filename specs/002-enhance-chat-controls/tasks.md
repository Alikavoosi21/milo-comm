---
description: "فهرست کارهای اجرایی feature مدیریت، تنظیمات و قواعد اختصاصی گفتگو"
---

# Tasks: مدیریت، تنظیمات و قواعد اختصاصی گفتگو

**Input**: اسناد طراحی در /specs/002-enhance-chat-controls/

**Prerequisites**: plan.md، spec.md، research.md، data-model.md، contracts/ و quickstart.md

**Tests**: طبق قانون اساسی پروژه، taskهای آزمون برای هر داستان الزامی و پیش از پیاده‌سازی همان داستان قرار گرفته‌اند.

**Organization**: کارها بر اساس user story مرتب شده‌اند تا هر بخش مستقل پیاده‌سازی و ارزیابی شود.

## Format: [ID] [P?] [Story] Description

- **[P]**: قابل انجام هم‌زمان در فایل‌های جدا و بدون وابستگی به task ناتمام
- **[Story]**: نگاشت مستقیم به داستان کاربر
- همه taskها مسیر دقیق فایل دارند.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: آماده‌کردن baseline و ماتریس مرورگر پیش از تغییر رفتار

- [X] T001 baseline فعلی typecheck، lint، unit و build را اجرا و نتیجه و هر failure قبلی را در specs/002-enhance-chat-controls/quickstart.md ثبت کن
- [X] T002 [P] پروژه‌های Playwright دسکتاپ 1440×900 و موبایل 390×844 را برای آزمون‌های feature در playwright.config.ts تعریف کن

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: قرارداد داده، migration، validation و سرویس‌های مشترک لازم برای همه داستان‌ها

**CRITICAL**: هیچ user story پیش از تکمیل این phase شروع نمی‌شود.

- [X] T003 [P] نوع Conversation را با instructions با مقدار پیش‌فرض رشته خالی و حداکثر 4000 نویسه، revision عدد صحیح مثبت، updatedAt و lifecycleState از نوع active | deleting در lib/types.ts توسعه بده
- [X] T004 [P] ستون‌های instructions TEXT NOT NULL DEFAULT ''، revision INTEGER NOT NULL DEFAULT 1، updated_at TIMESTAMPTZ NOT NULL DEFAULT now() و lifecycle_state با مقدار active | deleting و index مالک‌محور را در lib/db/schema/chat.ts مدل کن
- [X] T005 migration سازگار با داده قدیمی، backfill، constraintها و indexهای context_snapshots(source_type, source_id) و message_attachments(attachment_id) را در drizzle/0001_enhance_chat_controls.sql ایجاد کن
- [X] T006 [P] schema مشترک PATCH را با قاعده «title پس از trim بین 1 و 80 نویسه»، «instructions حداکثر 4000 نویسه»، expectedRevision عدد صحیح مثبت، حداقل یکی از title یا instructions و رد فیلد ناشناخته در lib/validation/chat.ts اضافه کن
- [X] T007 hydrate داده قدیمی و repository mutationهای اتمیک و مالک‌محور را با defaultهای instructions=''، revision=1 و lifecycleState='active' در lib/db/repositories/memory-store.ts پیاده‌سازی و از lib/db/repositories/index.ts صادر کن
- [X] T008 [P] registry فرایندی AbortController/lease را با register، cancel، release و active-revision guard در lib/chat/generation-registry.ts پیاده‌سازی کن
- [X] T009 [P] حذف idempotent storageKey و رفتار امن فایل ناموجود را در lib/files/storage.ts اضافه کن
- [X] T010 reset کردن conversation state، generation registry و storage fixtureهای feature را برای جداسازی آزمون‌ها در tests/setup.ts فراهم کن

**Checkpoint**: مدل و زیرساخت مشترک آماده است و داستان‌ها می‌توانند پس از این نقطه مستقل پیش بروند.

---

## Phase 3: User Story 1 - تغییر نام و حذف گفتگو (Priority: P1) MVP

**Goal**: مالک بتواند نام گفتگو را تغییر دهد یا پس از تأیید فارسی آن را دائمی حذف کند؛ حذف هنگام stream تولید را متوقف و تمام داده انحصاری را پاک کند.

**Independent Test**: یک گفتگو rename و پس از reload با نام تازه دیده می‌شود؛ cancel حذف هیچ تغییری نمی‌دهد؛ confirm حذف آن را از فهرست و URL قبلی حذف می‌کند، درحالی‌که foreign resource افشا و فایل مشترک پاک نمی‌شود.

### Tests for User Story 1

- [X] T011 [P] [US1] تست contract برای PATCH نام معتبر/خالی/81 نویسه/نام تکراری/revision قدیمی و DELETE با پاسخ‌های 204، 404 و 409 را در tests/contract/conversation-management-api.test.ts بنویس و ابتدا شکست آن را تأیید کن
- [X] T012 [P] [US1] تست integration مالکیت یکسان برای missing/foreign، حذف graph شامل branch/message/generation/snapshot مشتق، بقای فایل مشترک، حذف فایل انحصاری و race حذف وسط stream را در tests/integration/conversation-deletion.test.ts بنویس و ابتدا شکست آن را تأیید کن
- [X] T013 [P] [US1] تست E2E تغییر نام با Enter/Escape و persistence، dialog فارسی cancel/confirm، هدایت پس از حذف و جلوگیری از submit تکراری را در tests/e2e/conversation-management.spec.ts بنویس و ابتدا شکست آن را تأیید کن

### Implementation for User Story 1

- [X] T014 [US1] سرویس rename و lifecycle حذف ACTIVE → DELETING → DELETED را با حذف snapshotهای sourceType=conversation، تشخیص attachment انحصاری و cleanup idempotent در lib/chat/conversation-lifecycle.ts پیاده‌سازی کن
- [X] T015 [US1] GET موجود را با metadata تازه هماهنگ و PATCH عنوان و DELETE مالک‌محور را مطابق specs/002-enhance-chat-controls/contracts/conversation-management-api.yaml در app/api/conversations/[conversationId]/route.ts پیاده‌سازی کن
- [X] T016 [US1] stream را در registry ثبت کن، cancellation ناشی از DELETE را status=cancelled بده و final persist را با active lease guard در app/api/conversations/[conversationId]/messages/route.ts ایمن کن
- [X] T017 [P] [US1] alertdialog قابل استفاده با صفحه‌کلید، focus اولیه روی «انصراف»، بازگرداندن focus و aria-live خطا را در components/ui/confirm-dialog.tsx بساز
- [X] T018 [US1] منوی فارسی rename/delete، editor با Enter/Save و Escape/Cancel، pending/error و optimistic rollback را در components/chat/conversation-actions.tsx بساز
- [X] T019 [US1] عملیات گفتگو را به header و sidebar وصل، نام تازه را در هر دو همگام و پس از حذف فعال به صفحه شروع هدایت کن؛ فایل‌ها: components/chat/chat-screen.tsx و components/sidebar/conversation-sidebar.tsx

**Checkpoint**: US1 به‌تنهایی یک MVP کامل و قابل ارائه است.

---

## Phase 4: User Story 2 - قواعد اختصاصی هر گفتگو (Priority: P2)

**Goal**: کاربر قواعد تا 4000 نویسه را برای یک گفتگو ذخیره/پاک کند و فقط پاسخ‌های بعدی همان گفتگو و تمام branchهای آن از snapshot قواعد پیروی کنند.

**Independent Test**: قواعد Chat A در نخستین درخواست بعدی fake model دیده می‌شود، پاسخ‌های قبلی و stream جاری عوض نمی‌شوند و Chat B هیچ بخشی از قواعد A را دریافت نمی‌کند.

### Tests for User Story 2

- [X] T020 [P] [US2] تست unit ترتیب «دستور ثابت محصول → قواعد delimiterدار گفتگو → history → منابع»، حفظ کامل قواعد و budget/truncated را در tests/unit/context-builder.test.ts بنویس و ابتدا شکست آن را تأیید کن
- [X] T021 [P] [US2] تست contract ذخیره، ویرایش، پاک‌کردن، 4000/4001 نویسه، patch خالی، فیلد ناشناخته و conflict قواعد را در tests/contract/conversation-instructions-api.test.ts بنویس و ابتدا شکست آن را تأیید کن
- [X] T022 [P] [US2] تست integration جداسازی دو گفتگو، اشتراک قواعد میان branchهای یک گفتگو، snapshot در شروع generation، edit وسط stream و عدم تغییر history را در tests/integration/conversation-instructions.test.ts بنویس و ابتدا شکست آن را تأیید کن
- [X] T023 [P] [US2] تست E2E پنل فارسی، شمارنده 4000، save/clear/cancel، dirty-state guard، حفظ draft در failure و reload persistence را در tests/e2e/conversation-instructions.spec.ts بنویس و ابتدا شکست آن را تأیید کن

### Implementation for User Story 2

- [X] T024 [US2] buildContext را برای دریافت instructions snapshot و افزودن آن پایین‌تر از دستور ایمنی و بالاتر از history، بدون برش ناقص قواعد، در lib/chat/context-builder.ts توسعه بده
- [X] T025 [US2] مقدار instructions و revision را یک‌بار در شروع request بگیر و همان snapshot را تا پایان stream به Context Builder بده؛ فایل: app/api/conversations/[conversationId]/messages/route.ts
- [X] T026 [US2] PATCH همان منبع گفتگو را برای ذخیره یا پاک‌کردن instructions با expectedRevision، پاسخ 409 دارای metadata جاری و عدم ثبت متن خصوصی در log در app/api/conversations/[conversationId]/route.ts تکمیل کن
- [X] T027 [P] [US2] dialog/panel «راهنمای این گفتگو» را با textarea دارای label، aria-describedby، شمارنده باقی‌مانده، Save/Cancel/Clear، وضعیت فارسی و draft پایدار در components/chat/conversation-instructions-dialog.tsx بساز
- [X] T028 [US2] trigger پنل قواعد، همگام‌سازی revision و dirty navigation guard را بدون نمایش قواعد به‌عنوان message در components/chat/chat-screen.tsx یکپارچه کن

**Checkpoint**: US2 مستقل قابل آزمون است و قواعد هیچ گفتگوی دیگری را آلوده نمی‌کند.

---

## Phase 5: User Story 3 - فضای خواناتر برای مکالمه (Priority: P3)

**Goal**: transcript در دسکتاپ حداقل 75٪ و موبایل حداقل 70٪ ارتفاع viewport را داشته باشد، composer در دسترس بماند و streaming scroll دستی را ندزدد.

**Independent Test**: در 1440×900 و 390×844 اندازه transcript از حد مشخص کمتر نیست، overflow افقی و هم‌پوشانی وجود ندارد و کاربری که هنگام stream بالا رفته به انتها پرتاب نمی‌شود.

### Tests for User Story 3

- [X] T029 [P] [US3] تست E2E اندازه واقعی transcript، نبود horizontal overflow، دسترسی composer، گفتگوی طولانی، keyboard موبایل و رفتار near-bottom auto-scroll را در tests/e2e/chat-layout.spec.ts بنویس و ابتدا شکست آن را تأیید کن

### Implementation for User Story 3

- [X] T030 [P] [US3] shell گفتگو را با 100dvh، grid rows برابر auto minmax(0,1fr) auto، min-height:0، transcript مستقل و محاسبه bottom navigation موبایل در app/globals.css بازطراحی کن
- [X] T031 [P] [US3] auto-scroll را فقط وقتی کاربر نزدیک انتهای transcript است اجرا و reduced-motion و تغییر conversation را درست مدیریت کن؛ فایل: components/chat/chat-screen.tsx

**Checkpoint**: US3 بدون وابستگی رفتاری به قواعد یا تنظیمات قابل اندازه‌گیری است.

---

## Phase 6: User Story 4 - تنظیمات کاملاً فارسی (Priority: P4)

**Goal**: کاربر از ورودی sidebar تا صفحه تنظیمات، theme، وضعیت موفق/خطا و دسترسی صفحه‌کلید یک تجربه فارسی و RTL داشته باشد.

**Independent Test**: صفحه تنظیمات با keyboard باز و استفاده می‌شود؛ همه متن‌های عمومی و accessible nameها فارسی‌اند، نام‌های فنی در جمله فارسی جهت درست دارند و theme پس از reload باقی می‌ماند.

### Tests for User Story 4

- [X] T032 [P] [US4] تست E2E ناوبری صفحه‌کلید، متن‌ها و accessible nameهای فارسی، RTL، حالت روشن/تاریک، پیام موفق/خطا و persistence را در tests/e2e/settings-localization.spec.ts بنویس و ابتدا شکست آن را تأیید کن

### Implementation for User Story 4

- [X] T033 [P] [US4] صفحه محتوایی تنظیمات را با heading، توضیح، کنترل theme، وضعیت فارسی aria-live و نمایش درست نام‌های فنی در components/settings/settings-screen.tsx بساز
- [X] T034 [US4] route تنظیمات را در app/(chat)/settings/page.tsx ایجاد و SettingsScreen را در layout فعلی نمایش بده
- [X] T035 [US4] لینک «تنظیمات» با accessible name فارسی را به sidebar اضافه و ThemeToggle را برای استفاده در صفحه و feedback قابل بازیابی هماهنگ کن؛ فایل‌ها: components/sidebar/conversation-sidebar.tsx و components/ui/theme-toggle.tsx

**Checkpoint**: هر چهار داستان مستقل کار می‌کنند و رابط تنظیمات کاملاً فارسی است.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: کنترل نهایی امنیت، دسترس‌پذیری، قرارداد و کیفیت کل feature

- [X] T036 [P] جریان‌های keyboard، focus return، نام فارسی کنترل‌ها و کنتراست هر دو theme را برای عملیات و dialogهای تازه در tests/e2e/accessibility.spec.ts پوشش بده
- [X] T037 [P] لاگ ساختاریافته نتیجه/تأخیر rename، delete و save rules را بدون ثبت title، instructions، message یا راز در lib/observability/logger.ts و سرویس‌های feature اضافه کن
- [X] T038 [P] قرارداد نهایی endpointها و schemaهای TypeScript را با specs/002-enhance-chat-controls/contracts/conversation-management-api.yaml تطبیق بده و تغییر لازم را در همان contract ثبت کن
- [X] T039 کل مجموعه npm run typecheck، npm run lint، npm test، npm run build و npm run test:e2e را اجرا و نتیجه را همراه راستی‌آزمایی دستی سناریوها در specs/002-enhance-chat-controls/quickstart.md ثبت کن

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** بدون وابستگی آغاز می‌شود.
- **Phase 2** پس از Phase 1 اجرا می‌شود و همه user storyها را مسدود می‌کند.
- **US1 تا US4** پس از Foundation از نظر فنی قابل شروع‌اند، اما ترتیب پیشنهادی تحویل P1 → P2 → P3 → P4 است.
- **Phase 7** پس از storyهایی که قرار است منتشر شوند اجرا می‌شود.

### User Story Dependencies

- **US1 (P1)**: فقط به Foundation وابسته است و MVP پیشنهادی است.
- **US2 (P2)**: به Foundation وابسته است؛ از PATCH و revision مشترک استفاده می‌کند، ولی با تست API/context مستقل قابل تکمیل است.
- **US3 (P3)**: فقط به Foundation وابسته است؛ تغییر مشترک chat-screen باید پس از merge US1/US2 بازاعمال و تست شود.
- **US4 (P4)**: فقط به Foundation و API موجود preferences وابسته است.

### Within Each User Story

1. تست‌های همان story نوشته و failure مورد انتظار تأیید می‌شوند.
2. مدل و service قبل از endpoint تکمیل می‌شوند.
3. endpoint قبل از اتصال UI تکمیل می‌شود.
4. checkpoint مستقل story قبل از رفتن به اولویت بعدی اجرا می‌شود.

## Parallel Opportunities

- در Setup، T002 می‌تواند هم‌زمان با baseline اجرا شود.
- در Foundation، T003، T004، T006، T008 و T009 فایل‌های جدا دارند؛ T005 پس از T004 و T007 پس از مدل/schema اجرا می‌شود.
- تست‌های هر story که [P] دارند می‌توانند هم‌زمان نوشته شوند.
- پس از Foundation، چهار story برای افراد مختلف قابل تقسیم‌اند؛ تعارض‌های chat-screen باید هنگام integration هماهنگ شوند.
- UIهای مستقل confirm dialog، instructions dialog و settings screen با service/backend مربوط به خود قابل موازی‌سازی‌اند.
- در Polish، T036 تا T038 موازی و T039 پس از همه آن‌هاست.

## Parallel Examples

### User Story 1

    Task T011: contract API
    Task T012: deletion/ownership integration
    Task T013: rename/delete E2E
    Task T017: accessible confirm dialog

پس از آماده‌شدن lifecycle و route، T018 و T019 این خروجی‌ها را یکپارچه می‌کنند.

### User Story 2

    Task T020: context unit tests
    Task T021: instructions contract tests
    Task T022: isolation/generation integration tests
    Task T023: instructions E2E
    Task T027: instructions dialog

### User Story 3 و 4

    Task T030: CSS/layout
    Task T031: scroll behavior
    Task T033: settings screen
    Task T032: settings E2E

## Implementation Strategy

### MVP First

1. Phase 1 را کامل کن.
2. Foundation را کامل کن.
3. فقط US1 را پیاده‌سازی و مستقلاً تست کن.
4. rename/delete را demo و در صورت رضایت منتشر کن.

### Incremental Delivery

1. Setup + Foundation
2. US1: مدیریت گفتگو
3. US2: قواعد اختصاصی
4. US3: فضای مکالمه
5. US4: تنظیمات فارسی
6. Polish و validation کامل

هر checkpoint باید قابل demo باشد و رفتار storyهای قبل را نشکند.

## Notes

- taskهای [P] فقط وقتی هم‌زمان اجرا شوند که تغییر مشترک ناتمام ندارند.
- test taskها باید قبل از implementation همان story نوشته و failure مورد انتظارشان ثبت شود.
- migration و cleanup فایل نیاز به backup/fixture تستی دارند؛ روی داده واقعی بدون migration validation اجرا نشوند.
- برای هر task یا گروه منطقی کوچک commit جدا توصیه می‌شود.
