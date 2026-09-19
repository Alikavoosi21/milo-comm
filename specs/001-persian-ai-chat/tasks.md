---

description: "Task list for the Persian AI chat feature"
---

# Tasks: چت‌بات فارسی مایلو

**Input**: Design documents from `/specs/001-persian-ai-chat/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/chat-api.yaml](./contracts/chat-api.yaml)

**Tests**: الزامی‌اند؛ قانون اساسی پروژه پوشش خودکارِ رفتارهای قابل‌مشاهده را لازم می‌داند.

**Organization**: Taskها بر اساس user story سازمان‌دهی شده‌اند تا هر داستان مستقل قابل تکمیل و تست باشد.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: ساخت پروژه و ابزارهای مشترک.

- [X] T001 Create the Next.js TypeScript project and root configuration in package.json, tsconfig.json, next.config.ts, and app/
- [X] T002 [P] Configure Tailwind CSS, design-token variables, Persian font loading, and RTL globals in app/globals.css and app/layout.tsx
- [X] T003 [P] Configure ESLint, Prettier, strict TypeScript checks, and repository scripts in eslint.config.mjs, prettier.config.mjs, and package.json
- [X] T004 [P] Configure Vitest, Playwright, test setup, and CI-ready test scripts in vitest.config.ts, playwright.config.ts, tests/setup.ts, and package.json
- [X] T005 Create environment-variable schema for AI_BASE_URL, AI_API_KEY, AI_MODEL, DATABASE_URL, and private storage configuration in lib/validation/env.ts and .env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: زیرساختی که پیش از هر user story باید کامل شود.

**⚠️ CRITICAL**: هیچ کار user story نباید پیش از اتمام این Phase شروع شود.

- [X] T006 Create Drizzle configuration and PostgreSQL client in drizzle.config.ts and lib/db/client.ts
- [X] T007 Create User, UiPreference, Conversation, ConversationBranch, Message, and Generation schema in lib/db/schema/chat.ts with role `user|assistant` and message status `pending|streaming|completed|failed|cancelled`
- [X] T008 [P] Create Attachment, MessageAttachment, MessageConversationReference, and ContextSnapshot schema in lib/db/schema/context.ts with attachment status `selected|validating|uploading|extracting|ready|rejected|failed`
- [X] T009 Generate and document database migrations in drizzle/ and lib/db/migrate.ts
- [X] T010 Create a persistent anonymous-session owner resolver and server authorization guard in lib/auth/session.ts and lib/auth/require-owner.ts
- [X] T011 Create owner-scoped repositories for conversations, messages, branches, attachments, and references in lib/db/repositories/
- [X] T012 Create Zod input schemas for messages, attachment metadata, references, and message edits in lib/validation/chat.ts and lib/validation/files.ts
- [X] T013 Create server-only ModelGateway interface and OpenAI-compatible adapter configured only from validated environment variables in lib/model/gateway.ts and lib/model/openai-compatible.ts
- [X] T014 Create SSE event types and a stream writer for `accepted`, `file_reading`, `context_ready`, `generating`, `text_delta`, `completed`, `failed`, and `cancelled` in lib/model/stream-events.ts
- [X] T015 Create Context Builder that accepts owner, active branch, ready attachments, and explicit reference snapshots with a 20,000-token request budget in lib/chat/context-builder.ts
- [X] T016 Create private storage adapter contract and server-side file validation that enforces 3 files/message, 10MB/file, 20MB/message, allowlisted formats, MIME/signature matching, and rejection of encrypted/archive/executable/script/macro/corrupt files in lib/files/storage.ts and lib/files/validation.ts
- [X] T017 Create shared Persian error mapping, redacted structured logging, idempotency handling, and accessible status helpers in lib/chat/errors.ts, lib/observability/logger.ts, and components/ui/status-live-region.tsx

**Checkpoint**: بنیاد آماده است؛ user storyها می‌توانند شروع شوند.

---

## Phase 3: User Story 1 - شروع و ادامهٔ گفتگوی فارسی (Priority: P1) 🎯 MVP

**Goal**: کاربر گفتگوی جدید می‌سازد، پیام فارسی می‌فرستد و پاسخ stream‌شدهٔ دارای context همان گفتگو می‌گیرد.

**Independent Test**: ساخت گفتگو، ارسال دو پیام مرتبط و دریافت پاسخ دوم با توجه به پیام نخست، بدون فایل یا reference.

### Tests for User Story 1

- [X] T018 [P] [US1] Add contract tests for POST/GET /api/conversations and POST /api/conversations/{conversationId}/messages SSE events in tests/contract/chat-api.test.ts
- [X] T019 [P] [US1] Add unit tests for ordered active-branch context, 20,000-token trimming, and no unselected source inclusion in tests/unit/context-builder.test.ts
- [X] T020 [P] [US1] Add integration tests for owner-scoped conversation persistence, idempotent send, provider failure, and streamed generation states in tests/integration/chat-generation.test.ts
- [X] T021 [P] [US1] Add Playwright RTL flow for new chat, two related Persian turns, live status, retry, and keyboard send in tests/e2e/chat-core.spec.ts

### Implementation for User Story 1

- [X] T022 [US1] Implement GET and POST conversation handlers with owner scoping and automatic title generation in app/api/conversations/route.ts
- [X] T023 [US1] Implement active-branch message persistence, context creation, ModelGateway streaming, cancellation, retry, and SSE response in app/api/conversations/[conversationId]/messages/route.ts
- [X] T024 [US1] Implement server-side generation orchestration and message/status transitions in lib/chat/generation-service.ts
- [X] T025 [P] [US1] Create chat message list, user/assistant message cards, streaming text renderer, and branch-neutral empty state in components/chat/message-list.tsx and components/chat/message-card.tsx
- [X] T026 [P] [US1] Create Persian composer with empty-message validation, retry-preserved draft, submit shortcut, and status region in components/composer/chat-composer.tsx
- [X] T027 [US1] Create the new-chat landing page and conversation route with RTL layout and data loading in app/(chat)/page.tsx and app/(chat)/chat/[conversationId]/page.tsx
- [X] T028 [US1] Integrate composer, SSE client state, truthful progress labels, error UI, and message list in components/chat/chat-screen.tsx

**Checkpoint**: کاربر می‌تواند گفتگوی فارسیِ پیوسته بسازد و پاسخ stream‌شده بگیرد.

---

## Phase 4: User Story 2 - استفادهٔ ایمن از فایل در گفتگو (Priority: P1)

**Goal**: کاربر فایل مجاز را با راهنمای فارسی می‌فرستد و فایل نامجاز را با توضیح روشن، بدون از دست دادن draft، رد می‌کند.

**Independent Test**: پیوست TXT/PDF مجاز و پرسش دربارهٔ آن؛ سپس انتخاب ZIP یا فایل بیش از 10MB و مشاهدهٔ علت رد و حفظ پیام.

### Tests for User Story 2

- [X] T029 [P] [US2] Add contract tests for POST /api/attachments accepted, extracting, ready, and 422 rejection responses in tests/contract/attachments-api.test.ts
- [X] T030 [P] [US2] Add unit and malformed-fixture tests for allowlist, size limits, MIME/signature mismatch, encrypted/corrupt input, and CSV limits in tests/unit/file-validation.test.ts and tests/unit/file-extraction.test.ts
- [X] T031 [P] [US2] Add integration tests for owner-only private storage, extracted-text persistence, and ready-only context inclusion in tests/integration/attachment-context.test.ts
- [X] T032 [P] [US2] Add Playwright tests for pre-upload Persian helper, inline rejection, replace/remove action, and draft preservation in tests/e2e/file-upload.spec.ts

### Implementation for User Story 2

- [X] T033 [US2] Implement bounded non-executing extractors for PDF, DOCX, TXT, MD, and CSV plus extraction status transitions in lib/files/extraction.ts
- [X] T034 [US2] Implement private upload, server validation, checksum/metadata persistence, extraction queue, and 422 Persian errors in app/api/attachments/route.ts
- [X] T035 [P] [US2] Create attachment picker helper showing PDF/DOCX/TXT/MD/CSV and 10MB limit in components/composer/attachment-picker.tsx
- [X] T036 [P] [US2] Create attachment chips, progress state, Persian rejection card, replace/remove controls, and accessible announcements in components/composer/attachment-list.tsx
- [X] T037 [US2] Connect ready attachment IDs to the composer and show `در حال خواندن فایل` only while extraction/context assembly actually occurs in components/composer/chat-composer.tsx and components/chat/chat-screen.tsx

**Checkpoint**: فایل‌های معتبر وارد پاسخ می‌شوند و همهٔ خطاهای فایل تجربهٔ فارسی شفاف دارند.

---

## Phase 5: User Story 3 - ارجاع کنترل‌شده به گفتگوی دیگر (Priority: P2)

**Goal**: کاربر فقط گفتگوهای خودش را انتخاب و به پیام ارجاع می‌دهد؛ فقط snapshot آن‌ها وارد context می‌شود.

**Independent Test**: در یک فضای کاری، یک چت انتخاب و چت دیگر انتخاب‌نشده باقی می‌ماند؛ پاسخ فقط از منبع انتخاب‌شده استفاده می‌کند.

### Tests for User Story 3

- [X] T038 [P] [US3] Add unit tests for reference authorization, immutable snapshots, and no live/unselected chat leakage in tests/unit/reference-context.test.ts
- [X] T039 [P] [US3] Add integration tests for owner isolation and reference persistence in tests/integration/conversation-references.test.ts
- [X] T040 [P] [US3] Add Playwright flow for selecting, previewing, removing, and sending an explicit chat reference in tests/e2e/conversation-references.spec.ts

### Implementation for User Story 3

- [X] T041 [US3] Implement owner-scoped reference selection, immutable ContextSnapshot creation, and selected-reference context assembly in lib/chat/reference-service.ts and lib/chat/context-builder.ts
- [X] T042 [US3] Validate, persist, and expose reference IDs in app/api/conversations/[conversationId]/messages/route.ts
- [X] T043 [US3] Create searchable-in-memory conversation reference picker with explicit selection preview and remove action in components/composer/conversation-reference-picker.tsx
- [X] T044 [US3] Integrate selected-reference badges and disclosure into components/composer/chat-composer.tsx and components/chat/chat-screen.tsx

**Checkpoint**: منشن چت شفاف، محدود به مالک و قابل اعتماد است.

---

## Phase 6: User Story 4 - اصلاح پیام و شروع ادامهٔ تازه (Priority: P2)

**Goal**: ویرایش پیام user یک شاخهٔ جدید می‌سازد و مسیر قدیمی را بدون اختلاط حفظ می‌کند.

**Independent Test**: یک پیام ارسال، سپس ویرایش و regenerate شود؛ پاسخ جدید فقط از مسیر جدید زمینه بگیرد.

### Tests for User Story 4

- [X] T045 [P] [US4] Add contract tests for POST /api/messages/{messageId}/fork including active-generation 409 handling in tests/contract/message-fork-api.test.ts
- [X] T046 [P] [US4] Add unit tests for append-only fork creation, root-to-head traversal, and old-branch exclusion in tests/unit/branch-service.test.ts
- [X] T047 [P] [US4] Add integration tests for atomic generation cancellation, branch persistence, and idempotent regeneration in tests/integration/message-branching.test.ts
- [X] T048 [P] [US4] Add Playwright flow for edit, new-branch indicator, branch switching, and unchanged old response in tests/e2e/message-editing.spec.ts

### Implementation for User Story 4

- [X] T049 [US4] Implement append-only branch service that creates an edited user message at the original parent and advances only the new head in lib/chat/branch-service.ts
- [X] T050 [US4] Implement generation cancellation and owner-authorized fork endpoint in app/api/messages/[messageId]/fork/route.ts
- [X] T051 [US4] Create message edit form with cancel/confirm states in components/chat/message-editor.tsx
- [X] T052 [US4] Create compact Persian branch indicator and branch switcher that clearly separates old and new paths in components/chat/branch-switcher.tsx
- [X] T053 [US4] Integrate editing, fork response, active-branch reload, and no-old-path context in components/chat/chat-screen.tsx and lib/chat/context-builder.ts

**Checkpoint**: ویرایش پیام یک مسیر تازه و قابل‌تشخیص ایجاد می‌کند.

---

## Phase 7: User Story 5 - ناوبری منظم و تم دلخواه (Priority: P3)

**Goal**: گفتگوها بر اساس تازگی گروه‌بندی و تم روشن/تاریک به‌صورت پایدار و دسترس‌پذیر حفظ می‌شود.

**Independent Test**: ایجاد گفتگو در روزهای مختلف، مشاهدهٔ گروه‌های زمانی فارسی، تغییر تم، reload و تکمیل پیمایش صفحه‌کلید.

### Tests for User Story 5

- [X] T054 [P] [US5] Add unit tests for fa-IR today/yesterday/older grouping and timezone boundaries in tests/unit/conversation-grouping.test.ts
- [X] T055 [P] [US5] Add integration tests for owner-scoped theme preference persistence in tests/integration/ui-preferences.test.ts
- [X] T056 [P] [US5] Add Playwright tests for light/dark persistence, contrast-sensitive main flows, RTL order, and keyboard sidebar navigation in tests/e2e/theme-and-sidebar.spec.ts

### Implementation for User Story 5

- [X] T057 [US5] Implement owner-scoped conversation listing ordered by lastActivityAt and Persian date grouping in lib/chat/conversation-list-service.ts and app/api/conversations/route.ts
- [X] T058 [P] [US5] Create responsive RTL sidebar, grouped conversation list, current-chat state, and new-chat control in components/sidebar/conversation-sidebar.tsx
- [X] T059 [P] [US5] Create theme provider, initial persisted theme resolution, and accessible theme toggle using design tokens in components/ui/theme-provider.tsx and components/ui/theme-toggle.tsx
- [X] T060 [US5] Integrate sidebar and theme into app/(chat)/layout.tsx and app/globals.css without theme flash or low-contrast states

**Checkpoint**: فهرست گفتگو و تم در تجربهٔ فارسی روی موبایل و دسکتاپ قابل استفاده‌اند.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: کیفیت و امنیت مشترک میان همهٔ user storyها.

- [X] T061 [P] Add accessibility assertions for focus order, aria-live status, RTL semantics, and Persian error text in tests/e2e/accessibility.spec.ts
- [X] T062 [P] Add provider-adapter contract tests for base URL, auth behavior, stream errors, timeout, quota, and malformed-stream mapping in tests/integration/model-gateway.test.ts
- [X] T063 [P] Add security tests for cross-owner conversation/file/reference access and secret redaction in tests/integration/authorization-security.test.ts
- [X] T064 Implement context-truncation disclosure, per-source provenance labels, and user-visible retry/cancel polish in components/chat/chat-screen.tsx and lib/chat/context-builder.ts
- [X] T065 Review performance budgets, structured redacted telemetry, upload rate limits, and resource bounds in lib/observability/logger.ts, lib/files/validation.ts, and lib/chat/generation-service.ts
- [X] T066 Run every scenario from specs/001-persian-ai-chat/quickstart.md and record outcomes in specs/001-persian-ai-chat/quickstart.md

---

## Dependencies & Execution Order

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks every user story.
- US1 and US2 are P1; implement US1 first for a usable chat MVP, then US2 for file value.
- US3 and US4 both depend on foundational context and message models; after US1 they can proceed in parallel if staffed.
- US5 can proceed after Phase 2, but integrate after the base chat layout is present.
- Phase 8 depends on all desired user stories.

```text
Setup → Foundation → US1 (MVP) → US2
                         ├────→ US3
                         ├────→ US4
                         └────→ US5
All selected stories → Polish
```

## Parallel Opportunities

- T002–T004 may run together after T001.
- T007 and T008, then T010 and T013/T016, are parallel where their dependency boundaries permit.
- In each story, all test tasks marked `[P]` can run together.
- After Foundation, US3, US4, and US5 can be owned by different developers; avoid simultaneous edits to `components/chat/chat-screen.tsx` by sequencing integration tasks.

## Implementation Strategy

### MVP First

1. Finish T001–T017.
2. Finish T018–T028.
3. Run T018–T021; manually complete the US1 independent test.
4. Demo a Persian chat with memory and truthful streaming status before adding files or branching.

### Incremental Delivery

1. Add US2 for secure file-assisted chat.
2. Add US3 for explicit cross-chat context.
3. Add US4 for editable-message branching.
4. Add US5 for polished navigation and theme.
5. Complete the cross-cutting security, accessibility, and quickstart validation tasks.


