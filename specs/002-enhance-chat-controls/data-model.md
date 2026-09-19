# Data Model: مدیریت و قواعد گفتگو

## Conversation

فیلدهای موجود:
- id: UUID، کلید اصلی
- ownerId: UUID، مالک و مرز authorization
- title: متن نمایشی
- activeBranchId: UUID
- createdAt و lastActivityAt
- branches و messages در store محلی / روابط در PostgreSQL

فیلدهای افزوده:
- instructions: text، مقدار پیش‌فرض رشته خالی، حداکثر 4000 نویسه
- revision: integer، مقدار پیش‌فرض 1 و افزایش در هر mutation metadata/lifecycle
- updatedAt: timestamp with time zone، زمان آخرین mutation metadata
- lifecycleState: active | deleting؛ حالت deleted با نبود رکورد نمایش داده می‌شود

قواعد:
- title پس از trim بین 1 و 80 نویسه است؛ تکراری مجاز است.
- instructions پس از normalize حداکثر 4000 نویسه و فقط متعلق به همان Conversation است.
- ownerId هرگز از payload کلاینت گرفته نمی‌شود.
- branchها instructions جدا ندارند؛ همه branchها مقدار Conversation را استفاده می‌کنند.
- lastActivityAt برای گروه‌بندی پیام‌هاست؛ updatedAt برای concurrency metadata است.

## ConversationPatch

- title?: string
- instructions?: string
- expectedRevision: integer مثبت

حداقل یکی از title یا instructions باید حاضر باشد. پس از موفقیت، revision یک واحد زیاد و metadata تازه برگردانده می‌شود. mismatch برابر conflict است و هیچ فیلدی تغییر نمی‌کند.

## Generation Snapshot

رکورد مفهومی در آغاز ارسال پیام:
- conversationId
- conversationRevision
- instructions
- startedAt
- abort handle در registry فرایندی

instructions snapshot پیام نمایشی نیست. Context Builder از همین مقدار ثابت استفاده می‌کند تا edit هم‌زمان روی stream جاری اثر نگذارد.

## Deletion Set

برای delete یک service این مجموعه را تحت مالکیت محاسبه می‌کند:
- Conversation هدف
- ChatBranchها و ChatMessageهای آن
- Generationهای وابسته
- message attachment/reference joinها
- ContextSnapshotهای متعلق به messageهای حذف‌شونده
- ContextSnapshotهای دیگر که sourceType=conversation و sourceId=targetId دارند
- attachmentهایی که بعد از حذف هیچ message دیگری به آن‌ها reference ندارد
- storageKeyهای همان attachmentهای انحصاری برای cleanup

پاسخ‌های assistant تاریخی در گفتگوهای دیگر بازنویسی نمی‌شوند.

## State Transitions

    active + PATCH(valid revision) -> active(revision + 1)
    active + start generation -> active + generating lease
    generating + PATCH rules -> stream از snapshot قبلی؛ request بعدی از revision تازه
    active/generating + DELETE -> deleting -> deleted
    deleting + send/fork/patch -> conflict یا not-found طبق contract
    deleted + GET/PATCH/DELETE -> 404

DELETE ابتدا mutationهای تازه را می‌بندد، بعد stream را cancel می‌کند و سپس graph داده را حذف می‌کند. finalizer generation فقط وقتی persist می‌کند که Conversation هنوز active و lease معتبر باشد.

## Relational Mapping

تغییر conversations:
- instructions TEXT NOT NULL DEFAULT ''
- revision INTEGER NOT NULL DEFAULT 1
- updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
- lifecycle_state TEXT NOT NULL DEFAULT 'active' با check constraint

indexهای لازم:
- (owner_id, id) برای lookup/mutation مالک‌محور
- context_snapshots(source_type, source_id) برای پاک‌سازی snapshot مشتق
- message_attachments(attachment_id) برای تشخیص فایل مشترک

Migration:
1. ستون‌ها با default سازگار با رکوردهای موجود افزوده شوند.
2. داده قدیمی به instructions=''، revision=1، state='active' backfill شود.
3. NOT NULL/check/indexها اعمال شوند.
4. FK cascade موجود برای message/branch/generation/joinها تأیید شود.

## Local Store Mapping

Conversation interface همین فیلدهای جدید را دارد. loader داده قدیمی را هنگام hydrate با defaultها normalize می‌کند. delete روی یک clone/working set انجام و فقط پس از موفقیت cleanup منطقی یک persist نهایی اجرا می‌شود؛ حذف physical file idempotent است و شکست آن به‌صورت cleanup قابل retry ثبت/گزارش می‌شود.

## Ownership and Visibility

تمام read/writeها با ownerId فیلتر می‌شوند. شناسه غایب و متعلق به کاربر دیگر پاسخ یکسان 404 دارند. list payload شامل instructions نیست؛ detail payload شامل آن و revision است. هیچ instructions یا متن خصوصی در telemetry خام ثبت نمی‌شود.
