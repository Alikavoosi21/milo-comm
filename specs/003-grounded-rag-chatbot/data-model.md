# Data Model: چت‌بات RAG

## KnowledgeSource
رکورد فایل دانشی مشترک:
- id: UUID
- originalName: نام نمایشی فایل
- storageKey: شناسهٔ نسبی امن برای فایل ذخیره‌شده؛ مسیر دلخواه کاربر نیست
- mimeType, byteSize, sha256
- status: processing | ready | failed | replacing
- activeVersion: نسخهٔ قابل‌استفاده؛ در شکست جایگزینی ثابت می‌ماند
- errorCategory: دستهٔ خطای قابل نمایش، بدون stack/secret
- createdAt, updatedAt

قواعد:
- حداکثر سه منبع فعال یا در حال آماده‌سازی برای کل برنامه.
- فایل جدید ابتدا موقت ذخیره و اعتبارسنجی می‌شود؛ منبع ready قبلی تا پایان موفق ingest فعال می‌ماند.
- حذف منبع، chunkها و فایل مربوطه را پاک می‌کند؛ حذف فایل پس از موفقیت DB idempotent است.
- هم‌زمانی insert/replace با transaction یا قفل محدودیت سه منبع را دور نمی‌زند.
- متن استخراج‌شدهٔ کامل فقط موقت پردازش می‌شود؛ در telemetry یا log ثبت نمی‌شود.

## KnowledgeChunk (LangChain Document / pgvector)
- id: UUID پایدار برای حذف قطعه‌ها
- sourceId: کلید منبع
- sourceVersion: نسخهٔ منبع
- chunkIndex: ترتیب قطعه در متن استخراج‌شده
- page: شمارهٔ صفحه، در صورت موجود بودن
- pageContent: متن قطعهٔ خام، داخل vector store برای grounding
- embedding: بردار با ابعاد ثابت مدل embedding پیکربندی‌شده
- metadata: sourceId, sourceName, sourceVersion, chunkIndex و page
- اندازهٔ آغازین chunk برابر ۱۰۰۰ نویسه؛ chunkOverlap برابر ۱۵

هر پرس‌وجو فقط chunkهای sourceهای ready و version فعال را بازیابی می‌کند. تغییر مدل embedding نیازمند re-embedding کامل منابع است.

## ConversationMemory
بخش افزوده به conversation موجود:
- summary: خلاصهٔ کوتاه‌مدت یا null
- summarizedThroughMessageId: آخرین پیام اصلی که در خلاصه گنجانده شده
- summaryUpdatedAt: زمان خلاصه‌سازی
- activeHistoryPolicy: سیاست token cap و تعداد پیام‌های تازه؛ ابتدا 12k token و 8 پیام

قواعد:
- summary فقط متعلق به همان conversation و صرفاً context است.
- پیام‌های اصلی و ترتیب زمانی آن‌ها دست‌نخورده می‌مانند.
- پس از عبور از آستانه، پیام‌های قدیمی‌تر از پنجرهٔ اخیر با summary به مدل داده می‌شوند.
- ذخیرهٔ summary و checkpoint یک mutation واحد است؛ شکست موجب حذف پیام یا جابه‌جایی checkpoint نمی‌شود.
- اگر summary شکست بخورد، متن اصلی در storage می‌ماند و خطای قابل‌بازیابی ثبت می‌شود.

## UsageEvent
- id: UUID
- requestId: شناسهٔ opaque برای هم‌بستگی عملیات، فاقد محتوای کاربر
- operation: answer | summarize | embed | rerank
- modelName, providerName
- inputTokens, outputTokens: شمار واقعی در صورت برگشت provider؛ در غیر این صورت تخمین با نشانهٔ estimated
- costAmount: مبلغ یا null
- currency: کد ارز یا null
- durationMs, status, errorCategory, createdAt

هرگز prompt، پاسخ، نام فایل، متن chunk، API key یا اطلاعات شناسایی را ذخیره نمی‌کند. اگر provider شمار usage ندهد، token تخمینی یا null صریح است. صفحهٔ ادمین امکان فیلتر زمان/operation/model و جمع token/cost دارد.

## AdminSession
- cookie امضاشده با secret سمت سرور، HttpOnly, SameSite=Lax, Secure در production، انقضای محدود
- verifier رمز عبور ادمین از env؛ مقایسهٔ زمان‌ثابت؛ password در cookie/storage/log قرار نمی‌گیرد
- تمام APIهای admin روی سرور session را مستقل بررسی می‌کنند؛ مخفی‌کردن صفحه به‌تنهایی مجوز نیست

## RetrievalResult (موقت درخواست)
- conversation/request opaque IDs
- summary و پیام‌های تازهٔ همان conversation
- candidate chunkها و امتیاز vector
- چهار evidence منتخب و score rerank
- پاسخ ساختاریافته با فهرست شناسهٔ chunkهای citation شده
- token usage / latency برای event مصرف

RetrievalResult پایدار نمی‌شود مگر citationها بخشی از پیام assistant باشند؛ citation فقط به KnowledgeChunk فعال اشاره می‌کند.
