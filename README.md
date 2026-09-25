# MILO COMM

چت فارسی با حافظهٔ گفتگو و پاسخ مستند بر پایهٔ منابعی که مدیر ثبت می‌کند. پنل مدیریت برای بارگذاری منابع، انتخاب راهبرد RAG و مشاهدهٔ گزارش مصرف در نظر گرفته شده است.

## پیش‌نیازها

- Node.js و npm
- برای اجرای محلی RAG بدون PostgreSQL، حالت محلی را فعال کنید.
- برای پاسخ AI، کلید سرویس مدل و در صورت استفاده از embedding بیرونی، تنظیمات embedding لازم است.

## اجرای محلی

1. وابستگی‌ها را نصب کنید: npm install
2. فایل .env محلی بسازید و مقادیر لازم را وارد کنید. فایل‌های محیطی در Git ثبت نمی‌شوند.
3. برنامه را اجرا کنید: npm run dev
4. برای بررسی کد: npm run typecheck و npm run lint

تنظیمات محیطی با نام‌های AI_BASE_URL، AI_API_KEY، AI_MODEL، MOCK_AI، RAG_STORAGE_MODE، DATABASE_URL، STORAGE_DIR، EMBEDDING_BASE_URL، EMBEDDING_API_KEY، EMBEDDING_MODEL، RERANK_API_KEY، RERANK_MODEL، ADMIN_PASSWORD و ADMIN_SESSION_SECRET خوانده می‌شوند. مقدار محرمانه را در مخزن، issue یا log قرار ندهید.

## داده‌های محلی

منابع بارگذاری‌شده، بردارهای بازیابی، گفتگوها و فایل‌های محیطی محلی‌اند و در مخزن ثبت نمی‌شوند.
