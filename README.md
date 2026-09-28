# MILO COMM

چت فارسی با حافظهٔ گفتگو و پاسخ مستند بر پایهٔ منابعی که مدیر ثبت می‌کند. پنل مدیریت برای بارگذاری منابع، انتخاب راهبرد RAG و مشاهدهٔ گزارش مصرف در نظر گرفته شده است.

## پیش‌نیازها

- Node.js و npm
- برای اجرای محلی RAG بدون PostgreSQL، حالت محلی را فعال کنید.
- برای پاسخ AI، کلید سرویس مدل و در صورت استفاده از embedding بیرونی، تنظیمات embedding لازم است.

## اجرای محلی

1. وابستگی‌ها را نصب کنید: npm install
2. از روی قالب امن، فایل محیطی محلی بسازید: در PowerShell دستور Copy-Item .env.example .env یا در macOS/Linux دستور cp .env.example .env را اجرا کنید.
3. برای استفاده از مدل واقعی، AI_API_KEY و تنظیمات سرویس را در .env وارد کنید. برای PostgreSQL مقدار RAG_STORAGE_MODE=pgvector و DATABASE_URL را تنظیم کنید؛ حالت local به پایگاه داده نیاز ندارد. پیش از انتشار، ADMIN_PASSWORD و یک ADMIN_SESSION_SECRET تصادفی با حداقل ۱۶ نویسه تنظیم کنید.
4. برنامه را اجرا کنید: npm run dev
5. برای بررسی کد: npm run typecheck و npm run lint

تنظیمات محیطی با نام‌های AI_BASE_URL، AI_API_KEY، AI_MODEL، MOCK_AI، RAG_STORAGE_MODE، DATABASE_URL، STORAGE_DIR، EMBEDDING_BASE_URL، EMBEDDING_API_KEY، EMBEDDING_MODEL، RERANK_API_KEY، RERANK_MODEL، ADMIN_PASSWORD و ADMIN_SESSION_SECRET خوانده می‌شوند. مقدار محرمانه را در مخزن، issue یا log قرار ندهید.

## داده‌های محلی

منابع بارگذاری‌شده، بردارهای بازیابی، گفتگوها و فایل‌های محیطی محلی‌اند و در مخزن ثبت نمی‌شوند.
