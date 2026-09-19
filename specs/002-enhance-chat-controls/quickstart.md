# Quickstart: راستی‌آزمایی feature 002

## پیش‌نیاز

- Node.js و dependencyهای پروژه نصب باشند.
- فایل env پروژه تنظیم باشد.
- برای اجرای deterministic از MOCK_AI=true استفاده شود.
- migration جدید Drizzle پیش از حالت PostgreSQL اعمال شود.

## اجرای بررسی‌های خودکار

از ریشه پروژه اجرا کنید:

    npm run typecheck
    npm run lint
    npm test
    npm run build
    npm run test:e2e

تست E2E باید حداقل viewportهای 1440×900 و 390×844 را پوشش دهد.

## سناریوی تغییر نام

1. برنامه را با npm run dev اجرا کنید و گفتگویی بسازید.
2. از منوی گفتگو «تغییر نام» را انتخاب کنید.
3. یک نام 1 تا 80 نویسه‌ای ذخیره کنید.
4. بررسی کنید header و sidebar بدون از دست‌رفتن پیام‌ها تغییر کنند.
5. صفحه را reload کنید و ماندگاری نام را ببینید.
6. نام خالی و 81 نویسه‌ای باید خطای فارسی بدهند و editor باز بماند.

## سناریوی حذف

1. روی «حذف گفتگو» بزنید؛ dialog باید نام گفتگو و دائمی‌بودن حذف را نشان دهد.
2. «انصراف» را بزنید و باقی‌ماندن گفتگو را بررسی کنید.
3. دوباره باز و «حذف دائمی» را تأیید کنید.
4. هنگام stream نیز همین کار را تکرار کنید؛ stream باید متوقف، مسیر به صفحه معتبر هدایت و URL قدیمی 404 شود.
5. با inspection/test بررسی کنید message، branch، rules، snapshot مشتق و فایل انحصاری باقی نمانده و فایل مشترک سالم است.

## سناریوی قواعد گفتگو

1. در Chat A پنل «راهنمای این گفتگو» را باز کنید.
2. قاعده «پاسخ‌ها کوتاه و رسمی باشند» را ذخیره کنید و شمارنده 4000 را بررسی کنید.
3. پیام بعدی باید rules را در fake model context دریافت کند؛ پیام‌های قبل تغییر نکنند.
4. در Chat B پیام بفرستید و مطمئن شوید قواعد A در context آن نیست.
5. هنگام stream قواعد A را تغییر دهید؛ stream جاری باید snapshot قدیمی و درخواست بعدی مقدار جدید را بگیرد.
6. شکست PATCH را شبیه‌سازی کنید؛ draft باید حفظ و نسخه معتبر قبلی فعال بماند.

## سناریوی تنظیمات و layout

1. از sidebar وارد «تنظیمات» شوید؛ heading، توضیح، کنترل تم و پیام‌ها باید فارسی و RTL باشند.
2. فقط با Tab، Shift+Tab، Enter و Escape عملیات را کامل کنید؛ focus پس از بستن dialog به trigger برگردد.
3. در 1440×900 ارتفاع transcript حداقل 75٪ viewport و در 390×844 حداقل 70٪ باشد.
4. گفتگو را طولانی کنید؛ فقط transcript scroll شود، composer قابل دسترس بماند و overflow افقی وجود نداشته باشد.
5. هنگام streaming کمی به بالا scroll کنید؛ UI نباید کاربر را به انتها برگرداند مگر دوباره نزدیک انتها شود.

## انتظار contract

- PATCH معتبر: 200 و metadata با revision تازه
- validation نام/rules: 422 با پیام فارسی
- revision قدیمی: 409
- foreign یا missing: 404 یکسان
- DELETE موفق: 204؛ GET بعدی: 404
- تمام endpointها بدون session معتبر: پاسخ authorization موجود پروژه

## نتیجه نهایی پیاده‌سازی — 2026-09-19

- npm run typecheck: موفق
- npm run lint: موفق
- npm test: موفق؛ 20 فایل و 43 تست unit/contract/integration
- npm run build: موفق؛ مسیر /settings و Route Handlerهای گفتگو در production build ثبت شدند
- npm run test:e2e: موفق؛ 22 سناریو روی desktop 1440×900 و mobile 390×844
- قرارداد OpenAPI با parser YAML معتبر بود
- Playwright با MOCK_AI=true و یک worker اجرا می‌شود تا provider واقعی و store فایل محلی باعث نتیجه غیرقطعی نشوند