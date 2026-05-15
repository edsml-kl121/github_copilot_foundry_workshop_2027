---
description: "Task list for MOF HR Chatbot (MOF HR แชท) implementation"
---

# Tasks: MOF HR Chatbot (MOF HR แชท)

**Input**: Design documents from `specs/001-mof-hr-chatbot/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅ | quickstart.md ✅

**Tests**: Included — required by Constitution Principle II (Testing Standards, NON-NEGOTIABLE). TDD order: write failing tests first, then implement.

**Organization**: Tasks grouped by user story. US1 (core chat) → US2 (sliding window) → US3 (disclaimer) are independently testable increments.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (operates on different files, no incomplete-task dependencies)
- **[Story]**: User story label — [US1], [US2], [US3]
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding — create directory structure and configure build/lint/test tooling. No feature logic yet.

- [x] T001 Create directory structure: `app/`, `server/`, `tests/unit/`, `tests/integration/` at repository root (create each as an empty directory with a `.gitkeep` placeholder)
- [x] T002 Add `vite` ^5 and `vitest` ^2 as devDependencies in `package.json`; add scripts: `"dev": "vite"`, `"build": "vite build"`, `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`, `"lint": "eslint ."`; run `npm install`
- [x] T003 [P] Create `.eslintrc.cjs` at repository root: extend `eslint:recommended`, set `env: {browser: true, node: true, es2022: true}`, enforce `no-console: warn`, `no-unused-vars: error`

**Checkpoint**: `npm run lint` runs without error on empty project; `npm run test` exits with "no test files found"; Vite installed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core scaffolding that ALL user stories depend on — Vite config, server middleware skeleton, and base CSS. No business logic yet.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [x] T004 Create `vite.config.js` at repository root: import `defineConfig` from `vite`; define and export a plugin named `'hr-chat-api'` that uses `configureServer` to register `server/foundry.js`'s `createFoundryMiddleware()` on the `/api` path using `server.middlewares.use('/api', createFoundryMiddleware())`
- [x] T005 [P] Create `server/foundry.js`: add `'use strict'`; load `.env` via `dotenv` (same path pattern as `src/_config.js`); define all named constants — `MAX_HISTORY_MESSAGES = 10`, `MAX_MESSAGE_LENGTH = 2000`, `AGENT_RUN_TIMEOUT_MS = 30000`, `POLL_INTERVAL_MS = 2000`, `PDF_PATH = path.resolve(__dirname, '..', 'data', 'thai_leave_policy.pdf')`, `SYSTEM_PROMPT` (Thai semi-formal instruction string); export `createFoundryMiddleware()` as a stub that returns a connect middleware function (returns 404 for all routes for now)
- [x] T006 [P] Create `app/style.css`: define CSS custom properties `--blue: #1a56db`, `--white: #ffffff`, `--light-grey: #f3f4f6`; implement base layout — full-viewport flex column, header (blue background, white text), scrollable `.messages` area, fixed `.footer` containing `.input-row` and `.disclaimer`; style `.message.user` (right-aligned, blue bubble) and `.message.assistant` (left-aligned, white with border); ensure `.disclaimer` is always visible, never overlaps input

**Checkpoint**: `npm run dev` starts Vite on port 5173 without errors (index.html not yet created, expect 404 in browser — that is acceptable here).

---

## Phase 3: User Story 1 — HR Staff Asks a Policy Question (Priority: P1) 🎯 MVP

**Goal**: An HR staff member can type a Thai leave-policy question, the server uploads `data/thai_leave_policy.pdf` to Azure AI Foundry File Search, and the bot responds in semi-formal Thai within 30 seconds.

**Independent Test**: Open `http://localhost:5173`, type "พนักงานมีสิทธิ์ลาพักร้อนได้กี่วัน?", verify a Thai response citing leave entitlement data from the PDF arrives within 30 seconds.

### Tests for User Story 1 (write FIRST — must FAIL before implementation)

- [x] T007 [P] [US1] Write unit tests for POST `/api/chat` input validation in `tests/unit/chat-history.test.js`: import the `validateChatRequest` function (to be created in `server/foundry.js`); test that an empty `message` throws/returns an error, a `message` over 2000 chars is rejected, a missing `message` field is rejected, and a valid `{message, history:[]}` passes — run `npm test` and confirm these tests FAIL (function does not exist yet)
- [x] T008 [P] [US1] Write integration test skeleton in `tests/integration/chat-flow.test.js`: import Vitest; use `vi.skipIf(!process.env.FOUNDRY_API_KEY)` to skip when no credentials; add a test that POSTs `{message: "ลาพักร้อนได้กี่วัน?", history:[]}` to a started middleware instance and asserts the response JSON has a `reply` field of type string — run `npm test` and confirm this test is SKIPPED (no credentials in test env) or FAILS if credentials exist

### Implementation for User Story 1

- [x] T009 [US1] Implement `validateChatRequest(body)` in `server/foundry.js`: parse JSON body, validate `message` is non-empty string with max `MAX_MESSAGE_LENGTH` chars, validate `history` is an array where each item has `role` ∈ `{'user','assistant'}` and non-empty `content`, silently truncate `history` to `MAX_HISTORY_MESSAGES` items; return `{message, history}` on success or throw a descriptive error string on failure
- [x] T010 [US1] Implement `ensureAgent()` in `server/foundry.js`: create `AzureOpenAI` client with `{ endpoint: FOUNDRY_ENDPOINT, apiKey: FOUNDRY_API_KEY, apiVersion: '2025-01-01-preview' }` (exact pattern from `src/02_file_search.js` lines 28–58); upload `PDF_PATH` via `client.files.create({ file: fs.createReadStream(PDF_PATH), purpose: 'assistants' })`, create vector store via `client.vectorStores.create({ name: 'mof-hr-vs' })` then index with `client.vectorStores.fileBatches.createAndPoll(vectorStore.id, { file_ids: [file.id] })`, create assistant via `client.beta.assistants.create({ name: 'mof-hr-agent', instructions: SYSTEM_PROMPT, model: agentDeployment, tools: [{ type: 'file_search' }], tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } } })`; store `{client, assistantId, vectorStoreId, fileId, initialized:true}` in module-level `ctx`; on subsequent calls return cached `ctx`
- [x] T011 [P] [US1] Implement `handleHealth(req, res)` in `server/foundry.js`: write `Content-Type: application/json`, respond with `{status:'ok', agentReady: ctx?.initialized ?? false}` and HTTP 200
- [x] T012 [US1] Implement `handleChat(req, res)` in `server/foundry.js`: collect request body, call `validateChatRequest()` (return 400 on failure), call `ensureAgent()` (return 503 if not yet ready), create a new Foundry thread via `client.threads.create()`, loop through `history` array adding each `{role, content}` to the thread via `client.messages.create(thread.id, role, content)`, add the new `message` as a user message, call `client.runs.createAndPoll(thread.id, agentId, {pollingOptions:{intervalInMs:POLL_INTERVAL_MS}})` wrapped with a `AGENT_RUN_TIMEOUT_MS` timeout (reject with 504 error on timeout), extract assistant reply from `client.messages.list(thread.id, {order:'asc'})` iterating for the last `assistant` role message's text content, respond with `{reply}` and HTTP 200; catch all errors and return appropriate HTTP status per `contracts/api.md`
- [x] T013 [US1] Wire routes in `createFoundryMiddleware()` in `server/foundry.js`: parse the request URL; route `GET /health` → `handleHealth`, `POST /chat` → `handleChat`, all others → `next()`; parse raw body for POST requests using a simple `Buffer` accumulation (no body-parser library)
- [x] T014 [US1] Create `index.html` at repository root: `<script type="module" src="/app/main.js">` import; include `<link rel="stylesheet" href="/app/style.css">`; structure: `<header>` with "MOF HR แชท" title, `<main class="messages" id="messages">` scrollable area, `<footer>` with `<div class="input-row">` (textarea `id="input"` + send button `id="send-btn"`) and `<p class="disclaimer">ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง</p>`; implement `app/main.js`: on DOMContentLoaded poll `GET /api/health` every 2 s until `agentReady:true` then enable input; `sendMessage()` — read and trim textarea, guard blank, disable send, POST `{message, history:[]}` to `/api/chat`, append user and assistant messages to `#messages`, scroll to bottom, re-enable send; handle all error cases from `contracts/api.md` by showing a Thai error message in the chat area

**Checkpoint — US1 complete**: `npm run dev` → open `http://localhost:5173` → type "พนักงานมีสิทธิ์ลาพักร้อนได้กี่วัน?" → Thai answer appears within 30 s citing the leave policy PDF. `npm test` — T007 unit tests PASS.

---

## Phase 4: User Story 2 — Multi-Turn Conversation with Context (Priority: P2)

**Goal**: Follow-up questions in the same session use the last 5 turns of conversation history. The oldest turn is dropped when the 6th turn is added (sliding window). The server replays history into the Foundry thread per request.

**Independent Test**: Ask "พนักงานมีสิทธิ์ลาพักร้อนได้กี่วัน?" then immediately ask "แล้วลาคลอดล่ะ?" — the second answer should reference leave policy context without the user having to repeat that they are asking about leave.

### Tests for User Story 2 (write FIRST — must FAIL before implementation)

- [x] T015 [P] [US2] Write unit tests for sliding window logic in `tests/unit/chat-history.test.js`: import `appendMessage`, `getContextWindow` from `app/history.js`; test: (a) empty history returns empty array, (b) after 3 turns window contains 6 messages, (c) after 5 turns window contains exactly 10 messages, (d) after 6 turns the oldest 2 messages (first turn) are evicted and window still contains 10 messages, (e) `MAX_TURNS` exported constant equals 5 — run `npm test` and confirm these tests FAIL (module does not exist yet)

### Implementation for User Story 2

- [x] T016 [US2] Create `app/history.js`: export `const MAX_TURNS = 5`; export `function appendMessage(history, role, content)` — returns a new array with `{role, content}` appended then trimmed to `MAX_TURNS * 2` items (slice from end); export `function getContextWindow(history)` — returns `history.slice(-(MAX_TURNS * 2))` (the last 10 items)
- [x] T017 [US2] Update `app/main.js` to import and use `app/history.js`: add `import { appendMessage, getContextWindow } from './history.js'`; add module-level `let history = []`; in `sendMessage()`, before the fetch call, build `contextHistory = getContextWindow(history)` and send it as the `history` field in the POST body; after receiving the reply, update `history = appendMessage(history, 'user', message)` then `history = appendMessage(history, 'assistant', reply)` (use the return value — do not mutate in place)
- [x] T018 [US2] Update `handleChat()` in `server/foundry.js` to replay history: after `await ensureAgent()`, create the thread, then iterate `history` from the validated body and for each item call `await client.messages.create(thread.id, item.role, item.content)` before adding the new user message — server-side safety: slice to `MAX_HISTORY_MESSAGES` before iterating

**Checkpoint — US1 + US2 complete**: Two related questions in sequence — bot answer to the second question reflects context from the first. After 6 exchanges, the oldest exchange is no longer in context. `npm test` — T015 unit tests PASS.

---

## Phase 5: User Story 3 — Disclaimer Always Visible (Priority: P3)

**Goal**: The disclaimer "ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง" is permanently visible in the UI footer on every page load and during all conversation states.

**Independent Test**: Open `http://localhost:5173` without typing anything — confirm the disclaimer text is readable in the footer. Exchange 3 messages — confirm the disclaimer is still visible and not obscured by the chat messages or input area.

### Tests for User Story 3 (write FIRST — must FAIL before implementation)

- [x] T019 [P] [US3] Write disclaimer presence test in `tests/unit/ui.test.js`: use Node.js `fs.readFileSync('index.html', 'utf8')` to read the built HTML; assert it contains the exact string `"ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง"`; assert it contains a `class="disclaimer"` attribute — run `npm test` and confirm this test FAILS (index.html was just created in T014 but the disclaimer element may need to be verified exactly)

### Implementation for User Story 3

- [x] T020 [US3] Verify and finalise the disclaimer element in `index.html`: confirm the `<p class="disclaimer">` element in the `<footer>` contains the exact Thai disclaimer text from FR-005 (`"ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง"`); ensure no JavaScript in `app/main.js` removes or hides the element under any condition
- [x] T021 [US3] Finalise disclaimer styling in `app/style.css`: set `.disclaimer` to `position: sticky; bottom: 0` within the footer; use `font-size: 0.75rem`, muted grey text on white background, `padding: 0.25rem 1rem`; add a thin top border `border-top: 1px solid var(--blue)`; ensure the footer as a whole is `flex-shrink: 0` so it never scrolls out of view in the flex-column layout

**Checkpoint — All user stories complete**: Page load shows disclaimer immediately. Active conversation does not obscure the disclaimer. `npm test` — T019 test PASSES.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Graceful shutdown, full error-path coverage, loading UX, quality gates.

- [x] T022 [P] Add SIGINT and SIGTERM cleanup handler in `server/foundry.js`: register `process.on('SIGINT', cleanup)` and `process.on('SIGTERM', cleanup)`; `cleanup()` calls `client.deleteAgent(ctx.agentId).catch(()=>{})`, `client.vectorStores.delete(ctx.vectorStoreId).catch(()=>{})`, `client.files.delete(ctx.fileId).catch(()=>{})` then `process.exit(0)` — mirrors the `finally` block in `src/02_file_search.js`
- [x] T023 [P] Harden all error paths in `server/foundry.js`: wrap `ensureAgent()` in try/catch and return HTTP 503 with `{error:'HR agent is initialising, please retry in a moment'}` if init fails; wrap `createAndPoll` in a `Promise.race` against a `setTimeout(reject, AGENT_RUN_TIMEOUT_MS)` and return HTTP 504 with `{error:'The agent did not respond within 30 seconds. Please try again.'}` on timeout; wrap entire `handleChat` in outer try/catch returning HTTP 500 with generic error; log each error to `console.error` with context
- [x] T024 [P] Implement loading states in `app/main.js`: on page load show "กำลังเตรียมระบบ…" in `#messages` and disable `#send-btn` and `#input` until `/api/health` returns `agentReady:true`; while a chat request is in flight disable `#send-btn` and show a typing indicator `<div class="message assistant typing">…</div>` in the message list; remove the indicator and re-enable the button on response or error
- [x] T025 Run `npm run lint` across all files; fix every ESLint error (unused vars, missing semicolons, `console.log` → `console.error` where appropriate); ensure zero errors before proceeding
- [x] T026 Run `npm run test:coverage`; review the HTML coverage report; write additional unit tests in `tests/unit/` for any uncovered branch until coverage reaches ≥ 80% across `app/history.js` and `server/foundry.js`
- [x] T027 Follow `specs/001-mof-hr-chatbot/quickstart.md` end-to-end: `npm install` → `npm run dev` → open `http://localhost:5173` → ask 5 HR questions in Thai → verify SC-001 (≤30 s response), SC-002 (answers reference PDF), SC-003 (follow-up uses context), SC-004 (disclaimer visible), SC-005 (server starts in <3 s), SC-006 (no unhandled errors)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3 (US1)**: Depends on Phase 2 — MVP deliverable; BLOCKS Phase 4 and 5 only in the sense that the core infrastructure must exist
- **Phase 4 (US2)**: Depends on Phase 2; integrates with Phase 3 output (`app/main.js`, `server/foundry.js`)
- **Phase 5 (US3)**: Depends on Phase 2; integrates with Phase 3 output (`index.html`, `app/style.css`)
- **Phase 6 (Polish)**: Depends on Phases 3, 4, and 5 being complete

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Phase 2 — no dependency on US2 or US3
- **US2 (P2)**: Can start after Phase 2 — integrates with and extends US1's `app/main.js` and `server/foundry.js`
- **US3 (P3)**: Can start after Phase 2 — integrates with and extends US1's `index.html` and `app/style.css`

### Within Each User Story

- Tests (T007, T008, T015, T019) MUST be written and FAIL before implementation tasks begin
- In US1: `validateChatRequest` (T009) → `ensureAgent` (T010) → `handleChat` (T012) → UI wiring (T014)
- In US2: `app/history.js` (T016) → `app/main.js` update (T017) → `server/foundry.js` update (T018)
- In US3: disclaimer HTML (T020) → disclaimer CSS (T021)

---

## Parallel Opportunities

### Phase 2 parallel set
```
T005 server/foundry.js skeleton   ←─┐
T006 app/style.css base           ←─┴─ both can start simultaneously after T004
```

### Phase 3 parallel test set (write tests first)
```
T007 unit tests (validate)   ←─┐
T008 integration test        ←─┴─ both can be written simultaneously
```

### Phase 3 parallel implementation set
```
T010 ensureAgent()     ←─┐
T011 handleHealth()    ←─┴─ both can be implemented simultaneously after T009
```

### Phase 3 parallel: server vs UI
```
T009–T013 (server)   ←─┐
T014 (index.html +   ←─┴─ UI shell can be built in parallel with server work;
  app/main.js)              wired together only at T014 fetch call
```

### Phase 6 parallel set
```
T022 shutdown handler  ←─┐
T023 error hardening   ←─┤
T024 loading states    ←─┴─ all three touch different files; fully parallel
```

---

## Implementation Strategy

### MVP Scope (User Story 1 only — Phase 1 + 2 + 3)

1. Complete **Phase 1** (Setup)
2. Complete **Phase 2** (Foundational — CRITICAL GATE)
3. Write tests T007 + T008 — confirm they FAIL
4. Complete **Phase 3** tasks T009 → T014
5. **Validate**: `npm run dev` → type a Thai HR question → receive a Foundry-grounded answer
6. **STOP and DEMO** to stakeholders before proceeding to US2/US3

### Full Delivery (all phases)

After MVP sign-off:
- Phase 4 (US2) and Phase 5 (US3) can be worked in parallel by different engineers
- Phase 6 (Polish) follows

---

## Task Count Summary

| Phase | Story | Tasks | Parallel Tasks |
|-------|-------|-------|----------------|
| Phase 1: Setup | — | 3 (T001–T003) | 1 [P] |
| Phase 2: Foundational | — | 3 (T004–T006) | 2 [P] |
| Phase 3: US1 | P1 MVP | 8 (T007–T014) | 4 [P] |
| Phase 4: US2 | P2 | 4 (T015–T018) | 1 [P] |
| Phase 5: US3 | P3 | 3 (T019–T021) | 1 [P] |
| Phase 6: Polish | — | 6 (T022–T027) | 3 [P] |
| **Total** | | **27 tasks** | **12 [P]** |

### Independent test criteria per story

| Story | Independent Test Criterion |
|-------|---------------------------|
| US1 (P1) | `npm run dev` + type Thai leave question → Foundry-grounded Thai reply in ≤30 s |
| US2 (P2) | Two related Thai questions → second answer uses context from first; after 6 turns oldest is evicted |
| US3 (P3) | Page load → disclaimer visible in footer without any user interaction; stays visible during conversation |
