# Research: مدیریت، تنظیمات و قواعد اختصاصی گفتگو

## 1. شکل API مدیریت گفتگو

**Decision**: منبع موجود گفتگو با PATCH /api/conversations/{conversationId} و DELETE همان مسیر گسترش می‌یابد. PATCH فقط title و instructions را می‌پذیرد، expectedRevision اجباری دارد و object ناشناخته یا patch خالی را رد می‌کند.

**Rationale**: تغییر نام و قواعد هر دو تغییر جزئی metadata یک Conversation هستند؛ یک route مالک‌محور با validation مشترک، سطح API و تکرار authorization را کم می‌کند. revision جلوی overwrite خاموش بین دو tab را می‌گیرد.

**Alternatives considered**:
- مسیرهای action مانند /rename و /instructions: واضح ولی تکراری و خارج از سبک resource.
- PUT کامل Conversation: احتمال lost update و ارسال فیلدهای نامرتبط.
- ذخیره قواعد به‌صورت Message: history را آلوده و ویرایش‌پذیری را پیچیده می‌کند.

## 2. هم‌زمانی و پاسخ‌های HTTP

**Decision**: Conversation یک revision عددی و updatedAt دارد. PATCH با mismatch پاسخ 409 و نسخه فعلی metadata می‌دهد. DELETE موفق 204 است؛ missing و foreign هر دو 404 تا مالکیت افشا نشود. عملیات UI هنگام pending غیرفعال است.

**Rationale**: revision از timestamp قابل‌اعتمادتر و در store محلی و PostgreSQL یکسان است. PATCH تکرارشونده با همان مقدار امن است؛ delete دائمی بعد از موفقیت از UI حذف می‌شود.

**Alternatives considered**:
- ETag/If-Match: استاندارد HTTP خوبی است اما برای MVP و تست store محلی پیچیدگی بیشتری از expectedRevision دارد.
- soft delete/undo: با تصمیم محصول درباره حذف دائمی ناسازگار است.

## 3. مدل قواعد گفتگو و مرز prompt

**Decision**: instructions یک فیلد اختیاری در Conversation است؛ رشته خالی به مقدار خالی canonical تبدیل می‌شود و حداکثر 4000 نویسه دارد. Context Builder ابتدا دستور ثابت محصول، سپس بخش delimiterدار «قواعد کاربر برای این گفتگو» و بعد history/sourceها را می‌سازد. قواعد داده نامطمئن‌اند و هرگز نمی‌توانند ایمنی و حریم خصوصی را override کنند.

**Rationale**: scope قواعد دقیقاً یک گفتگو و همه branchهای آن است. گرفتن مقدار instructions و revision در آغاز generation باعث می‌شود ویرایش میان stream فقط روی درخواست بعدی اثر کند.

**Alternatives considered**:
- تنظیمات global کاربر: scope اشتباه و باعث نشت رفتار به گفتگوهای دیگر.
- جدول جداگانه conversation_settings: برای یک فیلد فعلی ارزش migration و join اضافه ندارد؛ اگر تنظیمات نسخه‌دار متعدد شد قابل استخراج است.

## 4. بودجه Context

**Decision**: دستور پایه و قواعد گفتگو هرگز به‌صورت نیمه بریده وارد prompt نمی‌شوند. validation سقف 4000 را تضمین می‌کند؛ budget باقی‌مانده به history فعال و سپس فایل‌ها/snapshotهای صریح اختصاص می‌یابد و truncated به UI گزارش می‌شود.

**Rationale**: بریدن وسط یک دستور رفتار نامشخص می‌سازد. قواعد بخشی از قرارداد تولید پاسخ‌اند، اما منابع مرجع قابل کوتاه‌سازی هستند.

## 5. چرخه حذف و generation فعال

**Decision**: lifecycle منطقی ACTIVE → DELETING → DELETED است. delete ابتدا گفتگو را برای mutationهای تازه می‌بندد، AbortController ثبت‌شده آن conversation را cancel می‌کند، سپس حذف وابستگی‌ها در یک واحد اتمیک repository انجام می‌شود. finalizer stream پیش از persist دوباره active بودن/revision را می‌سنجد.

**Rationale**: صرفاً حذف رکورد هنگام stream ممکن است finalizer آن را بازنویسی یا message یتیم بسازد. صبر برای پایان model نیز UX نامطمئن و timeoutپذیر دارد.

**Alternatives considered**:
- انتظار تا completion: کند و ممکن است بی‌نهایت بماند.
- فقط abort سمت browser: DELETE از tab یا client دیگری را پوشش نمی‌دهد.
- برای deployment چند-instance، registry حافظه‌ای کافی نیست و باید generation lease/status پایدار و cancellation مشترک اضافه شود؛ MVP فعلی single-process است.

## 6. وابستگی‌ها، snapshot و فایل

**Decision**: در PostgreSQL حذف Conversation از FK cascade برای branch/message/generation/joinها استفاده می‌کند و service صریحاً context_snapshotهایی را که sourceType=conversation و sourceId برابر گفتگوی حذف‌شده‌اند حذف می‌کند. attachment metadata و object فقط وقتی حذف می‌شوند که هیچ message دیگری به آن attachment وصل نباشد. پاک‌سازی object پس از commit، idempotent و قابل retry است. store محلی همین semantics را در یک persist نهایی تقلید می‌کند.

**Rationale**: snapshot مشتق باید طبق spec حذف شود ولی پاسخ تاریخی تغییر نمی‌کند. فایل یا منبع مشترک نباید با حذف یک conversation از بین برود.

## 7. UX تغییر نام، حذف و قواعد

**Decision**: actions از منوی فارسی گفتگو و header قابل دسترسی‌اند. rename ورودی prefilled با Enter/Save و Escape/Cancel دارد. delete از alertdialog شامل نام و عبارت «حذف دائمی» استفاده می‌کند و focus اولیه روی «انصراف» است. rules در dialog/panel header با textarea، شمارنده 4000، Save/Cancel، dirty-state guard و aria-live نمایش داده می‌شود.

**Rationale**: عملیات در همان context کشف‌پذیر می‌مانند، خطر حذف کم می‌شود و متن ویرایش‌شده در خطا از دست نمی‌رود.

**Alternatives considered**:
- حذف فوری با undo: با حذف دائمی و تأیید صریح spec سازگار نیست.
- صفحه مستقل rules: context گفتگو را از کاربر می‌گیرد و برای یک فیلد سنگین است.

## 8. layout و scroll

**Decision**: shell از 100dvh استفاده می‌کند؛ grid rows برابر auto minmax(0,1fr) auto است؛ فقط transcript overflow-y دارد و composer در ردیف آخر باقی می‌ماند. auto-scroll فقط وقتی کاربر نزدیک انتهای transcript است فعال می‌شود. موبایل bottom navigation را در محاسبه ارتفاع لحاظ می‌کند.

**Rationale**: min-height:0 مشکل متداول overflow در grid را رفع می‌کند و dvh با keyboard/address bar موبایل سازگارتر از vh است.

## 9. تنظیمات فارسی

**Decision**: ورودی «تنظیمات» در sidebar به /settings می‌رود و صفحه موجودیت‌های فعلی تنظیمات، از جمله theme، را با heading، help، success/error و accessible name فارسی و dir=rtl نشان می‌دهد. نام برند/model دست‌نخورده ولی در جمله فارسی قرار می‌گیرد.

**Rationale**: فقط icon پوسته معادل بخش تنظیمات قابل فهم نیست؛ صفحه متمرکز قابلیت آزمون localization و keyboard را فراهم می‌کند، بدون افزودن دسته تنظیمات خارج از scope.

## 10. راهبرد آزمون

**Decision**: unit برای normalize/limits/context ordering؛ contract برای PATCH/DELETE/statusها؛ integration برای ownership، isolation، cascade، فایل مشترک و race؛ Playwright برای rename persistence، cancel/confirm delete، rules، فارسی‌بودن، focus و اندازه‌های 390×844 و 1440×900.

**Rationale**: هر رفتار در بالاترین مرز عملی مطابق constitution آزموده می‌شود و آداپتر AI در تست با fake وفادار به contract جایگزین می‌شود.
