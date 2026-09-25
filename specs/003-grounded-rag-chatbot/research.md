# Research: چت‌بات RAG با حافظهٔ کوتاه‌مدت

تاریخ: 2026-09-24 | Feature: 003-grounded-rag-chatbot

## تصمیم‌های فنی

### 1. LangChain JavaScript، نه Python
پروژهٔ کپی‌شده TypeScript و Next.js است، بنابراین نسخهٔ JavaScript/TypeScript لنگ‌چین (langchainjs) از طریق پکیج‌های ماژولار در Route Handlerهای سمت سرور وارد می‌شود. مخزن پایتون langchain-ai/langchain که کاربر فرستاده برای اپ Next.js نصب مستقیم مناسبی نیست؛ همتای JS رسمی langchain-ai/langchainjs است.
منابع: [LangChain.js repository](https://github.com/langchain-ai/langchainjs)، [LangChain JavaScript docs](https://docs.langchain.com/oss/javascript).

### 2. ذخیره‌سازی بردار در PostgreSQL/pgvector
پروژه همین حالا pg، Drizzle و DATABASE_URL دارد. از @langchain/pgvector به‌عنوان VectorStore استفاده می‌شود تا embedding و metadata قطعه‌ها پایدار بمانند و در پرس‌وجوها با شناسهٔ منبع فیلتر شوند. Migration باید افزونهٔ vector را فعال کند. ابعاد بردار از پیکربندی embedding تثبیت می‌شوند؛ تغییر مدل یا ابعاد مستلزم re-embedding منابع است.
گزینهٔ جایگزین: جست‌وجوی in-memory/local. رد شد چون با restart داده از بین می‌رود و API رسمی PostgreSQL موجود در پروژه را دور می‌زند.
منبع: [LangChain.js vector store integrations](https://docs.langchain.com/oss/javascript/integrations/vectorstores).

### 3. قطعه‌بندی
از RecursiveCharacterTextSplitter در @langchain/textsplitters استفاده می‌شود. مقدار chunkOverlap دقیقاً ۱۵ کاراکتر است، مطابق درخواست. اندازهٔ chunk در ارزیابی نمونه‌های فارسی تعیین و در تنظیمات ثابت می‌شود؛ برای شروع ۱۰۰۰ کاراکتر در نظر گرفته می‌شود. metadata هر قطعه شامل sourceId, sourceName, chunkIndex و در صورت استخراج موجود، شمارهٔ صفحه است. فایل‌های فعلی حداکثر ۵۰٬۰۰۰ کاراکتر متن استخراج می‌کنند؛ ingest همین سقف را رعایت می‌کند.
منبع: [Recursive character text splitter](https://docs.langchain.com/oss/javascript/integrations/splitters/recursive_text_splitter).

### 4. RAG دو مرحله‌ای: retrieval گسترده و reranking
ابتدا جست‌وجوی برداری با k=12 کاندیدای مرتبط می‌گیرد، سپس reranker چندزبانه آن‌ها را امتیازدهی و مرتب می‌کند؛ حداکثر چهار قطعه با امتیاز پذیرفتنی به مدل پاسخ می‌روند. این روش نسبت به ارسال مستقیم نزدیک‌ترین نتایج برداری، امکان حذف false positiveها و بهبود ترتیب را می‌دهد. کاندیدای ۱۲ و آستانهٔ پذیرش نقطهٔ شروع‌اند و باید با پرسش‌های فارسی دارای پاسخ/بی‌پاسخ ارزیابی شوند.
پیشنهاد adapter: CohereRerank از @langchain/cohere با مدل چندزبانهٔ پیکربندی‌شده؛ credential جدا می‌خواهد و متن پرسش/قطعه‌های منتخب به سرویس rerank فرستاده می‌شود. اگر این ارسال پذیرفتنی نیست، جایگزین محلی باید پیش از پیاده‌سازی تعیین شود. در هر دو حالت، LLM نهایی فقط چهار شاهد را دریافت می‌کند. یک مرحلهٔ retrieval بدون rerank ساده‌تر و کم‌هزینه‌تر است، اما با شرط کاربر برای retrieval گسترده و reranking top-4 سازگار نیست.
منابع: [LangChain Cohere package](https://www.npmjs.com/package/@langchain/cohere)، [Cohere Rerank](https://docs.cohere.com/docs/rerank).

### 5. Embedding و ارائه‌دهنده
از OpenAIEmbeddings در @langchain/openai استفاده می‌شود و AI_BASE_URL/کلید موجود فقط در سرور خوانده می‌شوند. چت‌بات فعلی صرفاً chat-completions را نشان می‌دهد؛ سازگاری endpoint فعلی برای embeddings از کد قابل اثبات نیست. پیش از ingest باید درخواست embedding آزمایشی با پیکربندی واقعی انجام شود. در غیر این صورت، متغیرهای مستقل EMBEDDING_BASE_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL استفاده می‌شوند. اسم مدل embedding و ابعاد آن در نخستین ingest ثبت می‌شود تا تغییر ناخواستهٔ فضای برداری رخ ندهد.
منابع: [LangChain OpenAI embeddings](https://docs.langchain.com/oss/javascript/integrations/embeddings/openai)، [Embeddings overview](https://docs.langchain.com/oss/javascript/integrations/embeddings).

### 6. پاسخ مستند و مرز بی‌پاسخی
فقط نتایج rerank شده می‌توانند evidence باشند. اگر منبعی آماده نیست، نتیجه‌ای از آستانهٔ مرتبط‌بودن عبور نمی‌کند، یا خروجی ساختاریافتهٔ مدل citation/evidence معتبر ندارد، پاسخ مدل نمایش داده نمی‌شود و متن ثابت spec برگردانده می‌شود. مدل پاسخ با temperature=0 فراخوانی می‌شود. system instruction می‌گوید متن منبع و تاریخچه داده‌اند، نه دستور؛ فقط واقعیت‌های پشتیبانی‌شده با قطعه‌های ورودی باید پاسخ داده شوند. citationها از metadata قطعه ساخته می‌شوند.
برای stream موجود، سرویس ابتدا پاسخ ساختاریافته و کامل را اعتبارسنجی می‌کند، سپس پاسخ و citationها را stream می‌کند؛ نمایش تدریجی پیش از بررسی grounding مجاز نیست.

### 7. حافظهٔ کوتاه‌مدت و خلاصه‌سازی
حافظه فقط در محدودهٔ یک conversation است. تعداد token زمینه با tokenizer مدل یا برآورد محافظه‌کارانه سنجیده می‌شود. مقدار آغازین: خلاصه‌سازی وقتی history فعال از ۱۲٬۰۰۰ token گذشت؛ خلاصهٔ حاصل به حدود ۱٬۰۰۰ token محدود و ۸ پیام اخیر نگه داشته شود. این مقادیر پیکربندی‌پذیرند و در ارزیابی تنظیم می‌شوند. خلاصه فقط هدف/ترجیحات/واقعیت‌های گفته‌شده/موضوع باز را نگه می‌دارد و هرگز به retriever یا evidence پاسخ متصل نمی‌شود.
پیام‌های اصلی در transcript پایدار می‌مانند؛ pruning فقط انتخاب پیام‌هایی را که در درخواست بعدی به مدل می‌رسند تغییر می‌دهد. شکست summarization دادهٔ اصلی را حذف نمی‌کند. خلاصه‌سازی یک operation مدل با temperature=0 است و مصرفش جدا ثبت می‌شود.

### 8. middleware و telemetry هزینه
Pipeline سرور به گام‌های صریح تقسیم می‌شود: authorization و validation، ساخت حافظه و pruning، retrieval، reranking، evidence gate، generation، citation validation و cost logging. wrapperهای قبل/بعد درخواست نقش middleware دارند؛ جزئیات حساس یا متن خام در event نوشته نمی‌شود.
برای هر فراخوانی پاسخ/خلاصه‌سازی نام مدل، نوع operation، زمان، token ورودی/خروجی (usage برگشتی provider یا تخمین)، وضعیت و مبلغ محاسبه‌شده ثبت می‌شود. نرخ‌ها از env جداگانه می‌آیند. اگر rate تنظیم نشده باشد cost برابر unknown می‌ماند؛ حدس قیمت ممنوع است. API key و متن سؤال، پاسخ، prompt، فایل و قطعه‌ها ذخیره نمی‌شوند.

## محدودیت‌های نیازمند پیکربندی در پیاده‌سازی
- ارائه‌دهندهٔ embedding باید مدل فارسی‌پذیر و endpoint سازگار داشته باشد؛ سازگاری AI_BASE_URL بدون آزمایش فرض نمی‌شود.
- سرویس rerank پیشنهادی credential جدا دارد و بخش‌هایی از منبع را برای امتیازدهی دریافت می‌کند.
- آستانهٔ relevance و نرخ قیمت‌گذاری بدون داده و تنظیمات provider تعیین قطعی نمی‌شوند؛ مقدار اولیه در env قابل تنظیم است.
- storage فعلی فایل‌محور/محلی است؛ چند instance هم‌زمان در scope MVP نیست.
