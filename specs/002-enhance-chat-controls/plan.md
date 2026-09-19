# Implementation Plan: مدیریت، تنظیمات و قواعد اختصاصی گفتگو

**Branch**: 002-enhance-chat-controls | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from /specs/002-enhance-chat-controls/spec.md

## Summary

منبع موجود Conversation گسترش می‌یابد: PATCH مالک‌محور برای تغییر نام و قواعد، DELETE دائمی و هماهنگ برای توقف تولید و پاک‌سازی وابستگی‌ها، و افزودن قواعد نسخه‌دار گفتگو به Context Builder. رابط فعلی با منوی عملیات، تأیید حذف، پنل «راهنمای این گفتگو»، تنظیمات کاملاً فارسی و layout مبتنی بر 100dvh تکمیل می‌شود. معماری فعلی Next.js App Router، Route Handler، repository محلی و schema متناظر Drizzle حفظ می‌شود.

## Technical Context

**Language/Version**: TypeScript با target ES2022، React و Next.js 16.3.5 روی Node.js

**Primary Dependencies**: Next.js App Router/Route Handlers، React، Zod، Drizzle ORM، PostgreSQL، Tailwind CSS 4 و آداپتر موجود OpenAI-compatible

**Storage**: store محلی JSON در .data/store.json برای اجرای فعلی و schema/migration متناظر PostgreSQL با Drizzle؛ فایل‌ها از storage abstraction فعلی

**Testing**: Vitest برای unit/contract/integration و Playwright برای E2E، RTL، صفحه‌کلید و viewport

**Target Platform**: مرورگرهای مدرن دسکتاپ و موبایل در عرض 360 تا 1440 پیکسل؛ سرور Next.js روی Node.js

**Project Type**: برنامه وب full-stack تک‌پروژه‌ای با frontend و API در App Router

**Performance Goals**: بازخورد عملیات در کمتر از 1 ثانیه برای حداقل 95٪ درخواست‌ها؛ انعکاس فوری rename در sidebar/header؛ streaming بدون جابه‌جایی اجباری scroll کاربر

**Constraints**: نام 1 تا 80 نویسه پس از trim؛ قواعد حداکثر 4000 نویسه؛ منابع غایب و غیرمالک بدون افشای تفاوت؛ transcript حداقل 75٪ viewport دسکتاپ و 70٪ موبایل؛ حذف دائمی

**Scale/Scope**: چهار جریان کاربری روی برنامه موجود؛ یک migration، سه عملیات HTTP روی منبع گفتگو، یک صفحه تنظیمات، دو dialog/panel و توسعه تست‌های موجود

## Constitution Check

*GATE: پیش از پژوهش و دوباره پس از طراحی ارزیابی شد؛ همه دروازه‌ها پاس هستند.*

- **I — فارسی‌محور و دسترس‌پذیر**: همه متن‌ها و وضعیت‌ها فارسی و RTL هستند؛ dialogها focus management، نام فارسی، keyboard flow و کنتراست هر دو تم دارند. معیارهای ارتفاع در E2E سنجیده می‌شوند.
- **II — یکپارچگی گفتگو و دانش**: قواعد با Conversation ذخیره و فقط برای context همان گفتگو خوانده می‌شوند. مقدار rules در شروع generation ثابت می‌شود تا تغییر میان stream نتیجه جاری را عوض نکند.
- **III — حریم خصوصی و ایمنی**: mutationها با ownerId و conversationId محدود می‌شوند؛ missing و foreign هر دو 404 هستند. حذف snapshotهای مشتق و فایل‌های انحصاری را پاک می‌کند.
- **IV — Next.js ماژولار و نوع‌ایمن**: مطابق docs محلی Next.js 16، Route Handlerها در app/api باقی می‌مانند و params به صورت Promise await می‌شود. validation، lifecycle، context و UI جدا هستند.
- **V — تعامل قابل‌مشاهده و تاب‌آور**: rename، save و delete وضعیت فارسی دارند؛ متن rules در شکست حفظ می‌شود؛ delete stream فعال را cancel می‌کند و finalizer داده حذف‌شده را بازنمی‌گرداند.
- **دروازه آزمون**: رفتار عمومی در Playwright، مالکیت و lifecycle در integration، HTTP در contract و validation/context در unit پوشش داده می‌شوند.

**بازبینی پس از Phase 1**: مدل داده، contract و quickstart همین دروازه‌ها را رعایت می‌کنند؛ هیچ استثنا یا complexity waiver لازم نیست.

## Project Structure

### Documentation (this feature)

    specs/002-enhance-chat-controls/
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    ├── contracts/
    │   └── conversation-management-api.yaml
    └── tasks.md                         # خروجی $speckit-tasks

### Source Code (repository root)

    app/
    ├── (chat)/settings/page.tsx
    ├── api/conversations/[conversationId]/route.ts
    ├── api/preferences/route.ts
    └── globals.css
    components/
    ├── chat/chat-screen.tsx
    ├── chat/conversation-actions.tsx
    ├── chat/conversation-instructions-dialog.tsx
    ├── settings/settings-screen.tsx
    ├── sidebar/conversation-sidebar.tsx
    └── ui/confirm-dialog.tsx
    lib/
    ├── chat/context-builder.ts
    ├── chat/conversation-lifecycle.ts
    ├── chat/generation-registry.ts
    ├── db/repositories/memory-store.ts
    ├── db/schema/chat.ts
    ├── validation/chat.ts
    └── types.ts
    drizzle/[generated migration]
    tests/{unit,contract,integration,e2e}/

**Structure Decision**: ساختار full-stack فعلی حفظ می‌شود. Route Handler منبع گفتگو mutationها را ارائه می‌دهد؛ repository و lifecycle service مالکیت و پاک‌سازی را متمرکز می‌کنند؛ Context Builder تنها محل ورود rules به مدل است؛ componentهای تازه صرفاً state رابط و دسترس‌پذیری را مدیریت می‌کنند.

## Complexity Tracking

هیچ نقض قانون اساسی یا پیچیدگی اضافه‌ای نیاز به توجیه ندارد.
