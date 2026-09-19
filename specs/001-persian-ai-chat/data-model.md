# مدل داده: چت‌بات فارسی مایلو

## موجودیت‌ها

### User و UiPreference

`User` مالک تمام داده‌هاست. برای MVP می‌توان session ناشناس پایدار داشت، اما هر درخواست سرور باید
`ownerId` معتبر داشته باشد. `UiPreference` با رابطهٔ یک‌به‌یک، `theme` (`light` یا `dark`) را نگه
می‌دارد.

### Conversation و ConversationBranch

`Conversation`: شناسه، مالک، عنوان، زمان ایجاد و `lastActivityAt`. `ConversationBranch`: شناسه،
گفتگو، `rootMessageId`، `headMessageId`، برچسب و زمان ایجاد. هر گفتگو یک شاخهٔ فعال دارد؛ شاخهٔ
قدیمی read-only و قابل مشاهده می‌ماند.

### Message و Generation

`Message`: شناسه، گفتگو، شاخه، `parentMessageId`، نقش (`user` یا `assistant`)، محتوا، وضعیت
(`pending`, `streaming`, `completed`, `failed`, `cancelled`)، زمان و کلید idempotency. پیام تغییر
نمی‌کند. `Generation` مرحلهٔ واقعی پردازش، زمان‌ها و دستهٔ خطای redacted را به پیام دستیار وصل
می‌کند.

**گذار وضعیت**: پیام کاربر `pending → completed`؛ پیام دستیار
`pending → streaming → completed` یا `failed/cancelled`. فقط یک generation فعال برای هر head شاخه
اجازه دارد.

### Attachment و MessageAttachment

`Attachment`: مالک، کلید خصوصی ذخیره‌سازی، نام نمایشی sanitize‌شده، نوع اعلام‌شده و کشف‌شده، hash،
اندازه، وضعیت اعتبارسنجی (`selected`, `validating`, `uploading`, `extracting`, `ready`, `rejected`,
`failed`)، متن استخراج‌شده و اطلاعات محدودسازی. `MessageAttachment` اتصال بسیاری‌به‌بسیاری فایل و
پیام است.

**قواعد اعتبارسنجی**: 10MB برای هر فایل، 20MB و 3 فایل برای هر پیام؛ signature و type باید سازگار
باشند؛ encrypted، archive، executable، script، macro-enabled، corrupt و unreadable رد می‌شوند.

### MessageConversationReference و ContextSnapshot

`MessageConversationReference` گفتگوی صراحتاً انتخاب‌شده و مالک آن را به پیام وصل می‌کند. در لحظهٔ
ارسال، `ContextSnapshot` متن/نسخه/منبع‌های دقیق واردشده به درخواست را ثبت می‌کند. Context Builder
از snapshot و مسیر شاخه استفاده می‌کند، نه از دادهٔ زنده و انتخاب‌نشده.

## رابطه‌ها و حذف

User مالک Conversation، Attachment و UiPreference است. Conversation مالک Branch و Message است.
Message به Attachment و Reference متصل می‌شود. حذف یک فایل یا گفتگو باید دسترسی به شیء خام، متن
استخراج‌شده، reference و snapshotهای قابل‌استفاده را لغو کند.
