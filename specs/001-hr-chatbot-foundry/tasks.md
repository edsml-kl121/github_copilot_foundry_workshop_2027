---
description: "Task list for MOF HR Chat — HR Policy Chatbot"
---

# Tasks: MOF HR Chat — HR Policy Chatbot

**Input**: Design documents from `specs/001-hr-chatbot-foundry/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Tests**: Unit tests (tests/unit/chat.test.js) and integration tests (tests/integration/foundry.test.js) are included per the constitution's Testing Standards principle.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no cross-dependencies with in-progress tasks)
- **[Story]**: Which user story this task belongs to ([US1], [US2], [US3])
- All file paths are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and create the project skeleton. T001 must complete before any other task begins.

- [X] T001 Update package.json: add `vite`, `express`, `concurrently` as dependencies; add `vitest` as devDependency; add scripts `"dev": "concurrently \"vite\" \"node server/index.js\""`, `"build": "vite build"`, `"test": "vitest run"`, `"test:unit": "vitest run tests/unit"`, `"test:integration": "vitest run tests/integration"`; then run `npm install` in package.json
- [X] T002 [P] Create .env.template with all required Foundry keys: `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`, `FOUNDRY_PROJECT_ENDPOINT`, `FOUNDRY_DEPLOYMENT_AGENT`, `FOUNDRY_API_VERSION=2025-01-01-preview`, `FOUNDRY_DEPLOYMENT_CHAT=gpt-4o-mini`; add placeholder values and instructions comment at top of .env.template
- [X] T003 [P] Create vite.config.js at repo root: configure `server.proxy` so all `/api/*` requests proxy to `http://localhost:3001`; no other config needed
- [X] T004 [P] Create empty directory scaffolding: `app/`, `server/`, `tests/unit/`, `tests/integration/` (add a `.gitkeep` in each if empty)

**Checkpoint**: `npm install` succeeds; `vite.config.js` exists; directory structure matches plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend and pure-function modules that all user stories depend on.

⚠️ **CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Create server/foundry.js: export three async functions — `uploadAndIndex(client, pdfPath)` uploads `data/thai_leave_policy.pdf` and creates+polls a vector store (mirrors `src/02_file_search.js` exactly); `createAgent(client, vectorStoreId)` creates the assistant with Thai HR instructions and `file_search` tool; `query(client, assistantId, message, history)` creates a new thread seeded with history array then new user message, runs `createAndPoll`, extracts reply text, deletes thread; import `getConfig` from `../src/_config.js`; use `ASSISTANTS_API_VERSION = '2025-01-01-preview'` in server/foundry.js
- [X] T006 Create server/index.js: import Express and `server/foundry.js`; on startup call `uploadAndIndex` then `createAgent` with the AzureOpenAI client built from `getConfig()`; set `session.ready = true` when done; expose `GET /api/health` returning `{ status: 'ready' }` or `{ status: 'initialising' }`; expose `POST /api/chat` — validate `message` (400 if empty), check `session.ready` (503 if false), call `foundry.query()`, return `{ reply }` or catch errors and return appropriate Thai error strings from data-model.md; register `SIGTERM`/`SIGINT` handlers to call cleanup (delete assistant, vector store, file) then exit; listen on port 3001; log `✅ Foundry agent ready` when initialisation completes in server/index.js
- [X] T007 [P] Create app/chat.js: export three pure functions — `addMessage(history, role, content)` appends `{ role, content, timestamp: new Date() }` to a copy and returns `trimHistory(newArr, 10)`; `trimHistory(history, maxItems)` returns last `maxItems` elements; `formatForAPI(history)` maps each item to `{ role, content }` dropping `timestamp`; no DOM access, no fetch, no side-effects in app/chat.js

**Checkpoint**: `node server/index.js` starts and prints `✅ Foundry agent ready` (requires .env); `GET http://localhost:3001/api/health` returns `{ "status": "ready" }`. `app/chat.js` functions are importable with no runtime errors.

---

## Phase 3: User Story 1 — Ask HR Policy Question (Priority: P1) 🎯 MVP

**Goal**: User opens the app, types a question in Thai, submits it, and receives a grounded Thai-language answer from the Foundry agent within 5 seconds.

**Independent Test**: Start `npm run dev`, open `http://localhost:5173`, type "พนักงานหญิงลาคลอดได้กี่วัน", click send, verify a Thai-language answer appears and the loading indicator was visible during the wait.

### Implementation for User Story 1

- [X] T008 [P] [US1] Create app/api.js: export `async function sendMessage(message, history)` — POST to `/api/chat` with `{ message, history }` body; on 2xx return `{ reply }`; on network error return `{ error: 'ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง' }`; on server error return the `{ error }` from the response body in app/api.js
- [X] T009 [P] [US1] Create index.html: `<!DOCTYPE html>` with `lang="th"` and UTF-8 charset; link `app/style.css`; body contains — header with app title placeholder, main section with `#messages` div (chat bubbles), form `#chat-form` with `#user-input` textarea and `#send-btn` submit button; script `type="module"` importing `app/main.js`; no inline styles or scripts in index.html
- [X] T010 [US1] Create app/main.js: on DOMContentLoaded wire `#chat-form` submit event — prevent default, read `#user-input` value, disable `#send-btn`, call `api.sendMessage(message, [])`, append user bubble to `#messages`, show loading indicator, on reply append assistant bubble and scroll to bottom, on error append error bubble, re-enable `#send-btn`; disable send when input is empty (input event listener); no history integration yet (US2 adds that) in app/main.js
- [X] T011 [P] [US1] Create app/style.css: CSS custom properties `--blue-primary: #1a56db`, `--blue-light: #e8f0fe`, `--white: #ffffff`, `--text-dark: #1a1a2e`; layout: full-height flex column, `#messages` scrollable flex-grow area, input form pinned to bottom; message bubble styles for `.bubble-user` (right-aligned, blue background) and `.bubble-assistant` (left-aligned, white/light background with border); `.loading-indicator` animated dots; `#send-btn:disabled` greyed; responsive min-width 360px in app/style.css

**Checkpoint**: User Story 1 is fully functional and independently testable. `npm run dev` + browser Q&A with HR policy question returns a Thai answer.

---

## Phase 4: User Story 2 — Multi-Turn Conversation (Priority: P2)

**Goal**: Follow-up questions within a session use the last 5 turns as context; refreshing the page resets history.

**Independent Test**: Ask "พนักงานหญิงลาคลอดได้กี่วัน", receive answer, then ask "แล้วถ้าลาก่อนครบกำหนดล่ะ" — verify the answer is contextually relevant (not treating it as an isolated query). Refresh the page and verify the chat is empty.

### Implementation for User Story 2

- [X] T012 [US2] Update app/main.js: import `addMessage`, `formatForAPI` from `./chat.js`; declare module-level `let history = []`; on each user send call `history = addMessage(history, 'user', message)`; pass `formatForAPI(history)` as the `history` argument to `api.sendMessage`; on assistant reply call `history = addMessage(history, 'assistant', reply)`; on error do NOT add the error to history in app/main.js
- [X] T013 [P] [US2] Update app/api.js: `sendMessage(message, history = [])` already passes history in the body — verify the function signature accepts and forwards the history param; no other changes needed unless history was hardcoded to `[]` in T008 in app/api.js
- [X] T014 [US2] Update server/index.js POST /api/chat handler: when `history` array is present in the request body, create the Assistants thread with those messages as initial thread messages before the new user message (seed the thread); update the `foundry.query()` call signature in server/index.js to accept and use the history param (update server/foundry.js query() if needed to accept the seeded messages)

**Checkpoint**: User Story 2 is fully functional. Follow-up questions receive contextually relevant responses. Sessions older than 5 turns drop the oldest turn automatically.

---

## Phase 5: User Story 3 — Disclaimer and Brand Identity (Priority: P3)

**Goal**: "MOF HR แชท" branding, blue-and-white colour scheme, permanent disclaimer visible at all times without scrolling.

**Independent Test**: Open `http://localhost:5173` — verify: (a) "MOF HR แชท" appears in the header, (b) primary colour is blue, (c) "ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง" is visible at the bottom without scrolling, (d) input is disabled on page load and enables once health returns ready.

### Implementation for User Story 3

- [X] T015 [P] [US3] Update index.html: set `<title>MOF HR แชท</title>`; update header element to display "MOF HR แชท" as `<h1>`; add a `<div id="disclaimer">` element with the exact text "ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง" placed after the chat form; add `aria-label` attributes to `#user-input` ("พิมพ์คำถามของคุณ") and `#send-btn` ("ส่งข้อความ") in index.html
- [X] T016 [US3] Update app/style.css: add `#disclaimer` styles — fixed or sticky positioning at bottom of viewport, always visible, small Thai font, grey background for contrast, z-index above messages; ensure `#messages` bottom padding accounts for disclaimer height; add `:focus-visible` styles for `#user-input` and `#send-btn`; verify colour variables match brand (--blue-primary, --white); confirm layout is usable at 360px viewport width in app/style.css
- [X] T017 [US3] Update app/main.js: on DOMContentLoaded disable `#send-btn` and `#user-input` immediately; poll `GET /api/health` every 2 s until response is `{ "status": "ready" }` then enable both; show a status message "ระบบกำลังเตรียมพร้อม..." in `#messages` during initialisation, replace it with "พร้อมรับคำถามแล้วครับ" when ready in app/main.js

**Checkpoint**: User Story 3 is fully functional. All three acceptance criteria pass visually. Input is locked during initialisation.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Tests, security hygiene, and final quality gate checks.

- [X] T018 [P] Write tests/unit/chat.test.js: Vitest tests — `addMessage` adds a message and returns new array (no mutation); `addMessage` trims to 10 items when called on a 10-item history; `trimHistory` returns last N items; `formatForAPI` strips timestamp and returns only `{ role, content }`; all tests run with `npm run test:unit` without credentials in tests/unit/chat.test.js
- [X] T019 Write tests/integration/foundry.test.js: Vitest test — import `getConfig` from `../src/_config.js`; if `FOUNDRY_API_KEY` env var is absent or placeholder, call `test.skip`; otherwise build AzureOpenAI client, call `foundry.uploadAndIndex()` then `foundry.createAgent()`, call `foundry.query()` with "ลาป่วยได้กี่วัน", assert reply is a non-empty string, call cleanup; test must not leak resources on failure (use try/finally) in tests/integration/foundry.test.js
- [X] T020 [P] Verify .gitignore: confirm `.env` is listed; confirm `node_modules/` is listed; add both if absent; verify .env.template has all keys present in src/_config.js `getConfig()` (no missing keys, no extra undocumented keys) in .gitignore and .env.template
- [X] T021 [P] Final quality gate: remove any `console.log` debug statements from app/ and server/ (keep the startup `✅ Foundry agent ready` log in server/index.js); verify no raw error objects or stack traces can reach the browser; run `npm run test:unit` and confirm all tests pass; verify `index.html` contains no `[ALL_CAPS_TOKEN]` placeholders

---

## Dependency Graph

```
T001 (npm install)
 ├── T002 [P]  (.env.template)
 ├── T003 [P]  (vite.config.js)
 ├── T004 [P]  (directories)
 ├── T005      (server/foundry.js)
 │    └── T006 (server/index.js)
 │         └── T014 (US2: seed history in server)
 ├── T007 [P]  (app/chat.js)
 │    └── T012 (US2: integrate chat.js into main.js)
 │         └── T014
 ├── T008 [P]  (app/api.js) ──────────────────── T013 [P] (US2: update api.js)
 │                                                  └── T014
 ├── T009 [P]  (index.html)
 │    └── T010 (app/main.js — US1)
 │         └── T012 → T014
 │         └── T017 (US3: health polling)
 └── T011 [P]  (app/style.css — US1)
      └── T016 (US3: brand + disclaimer styles)
           └── T015 [P] (US3: update index.html)
                └── T017

T018 [P]  (unit tests — needs T007)
T019      (integration test — needs T005, T006)
T020 [P]  (gitignore/template — needs T001, T002)
T021 [P]  (final gate — needs all implementation tasks)
```

## Parallel Execution Examples

### US1 (fastest path to PoC demo)
```
T001 → T005 → T006               (backend: sequential)
T001 → T007 [P]                  (chat.js: parallel with T005)
T001 → T008 [P] + T009 [P] + T011 [P]  (frontend files: parallel)
       T008 + T009 → T010         (main.js: after api.js + index.html)
```

### US2 (add multi-turn on top of US1)
```
T010 + T007 → T012
T008        → T013 [P]            (parallel with T012)
T012 + T013 + T006 → T014
```

### US3 (brand + disclaimer, parallel with US2)
```
T009 → T015 [P]                  (update index.html)
T011 → T016                      (update style.css)
T015 + T016 + T010 → T017        (health polling in main.js)
```

## Implementation Strategy

**MVP scope**: Complete Phase 1 + Phase 2 + Phase 3 (US1) — 11 tasks.
This delivers a fully functional PoC: a user can ask HR policy questions and receive grounded Thai answers.

**Increment 2**: Phase 4 (US2) — 3 more tasks (T012, T013, T014).
Adds multi-turn conversation context.

**Increment 3**: Phase 5 (US3) + Final Phase — 7 more tasks.
Adds brand identity, disclaimer, health-check UX polish, and tests.

**Suggested commit cadence**:
1. After T004: `chore: project scaffold and dependencies`
2. After T006: `feat: Foundry agent backend initialisation`
3. After T011: `feat(US1): single-turn HR policy Q&A`
4. After T014: `feat(US2): multi-turn conversation history`
5. After T017: `feat(US3): brand identity and disclaimer`
6. After T021: `test: unit and integration tests, final quality gate`
