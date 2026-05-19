# Research: MOF HR Chat

**Feature**: `001-hr-chatbot-foundry` | **Phase**: 0 — Research | **Date**: 2026-05-19
**Input**: Technical Context unknowns + best-practice questions from plan.md

---

## Decision 1: Frontend Architecture — Vite + Vanilla JS SPA

**Decision**: Vite is the build tool/dev server. The frontend is `index.html` plus three
`app/` modules (`main.js`, `chat.js`, `api.js`) and one stylesheet (`style.css`). No
JavaScript framework.

**Rationale**:
- Matches the directive: "Vite with minimal number of libraries. Use vanilla HTML, CSS,
  and JavaScript as much as possible."
- Vite provides HMR and an optimised production build with zero framework runtime overhead.
- A vanilla JS bundle easily stays under the 200 KB gzip constitution limit.
- Vite's `server.proxy` config eliminates CORS issues between frontend (port 5173) and
  the Express API (port 3001) without any additional middleware.

**Alternatives considered**:
- React or Vue with Vite — rejected: framework runtime overhead violates Code Quality
  principle; unnecessary complexity for a 3-screen PoC.
- Pure static HTML served by Express — rejected: no HMR, no Vite build optimisation,
  harder to develop iteratively.

---

## Decision 2: Backend Architecture — Minimal Express API Bridge

**Decision**: A single Express server (`server/index.js`) runs on port 3001. It
initialises the Foundry agent once at startup and exposes one endpoint: `POST /api/chat`.
A separate `GET /api/health` endpoint reports readiness.

**Rationale**:
- The Azure AI Foundry API key MUST NOT be exposed to the browser; a server-side bridge
  is mandatory.
- Express adds one dependency but makes body parsing, routing, and error handling trivial
  with minimal boilerplate vs. raw `http.createServer`.
- `concurrently` starts both Vite and Express with a single `npm run dev` command,
  keeping the developer workflow simple.

**Alternatives considered**:
- Vite SSR plugin — rejected: adds configuration complexity for a use case that only
  needs a simple proxy.
- Raw Node.js `http.createServer` — rejected: manual JSON parsing and routing increase
  boilerplate without reducing dependencies meaningfully.

---

## Decision 3: Foundry Agent Lifecycle — Create Once Per Server Session

**Decision**: On `server/index.js` startup, `foundry.js` uploads `thai_leave_policy.pdf`,
creates a vector store, indexes the file, and creates an assistant. The resulting
`assistantId`, `vectorStoreId`, and `fileId` are held in memory. Each chat request creates
a fresh thread (seeded with the last 5 turns), runs the assistant, returns the reply, then
discards the thread. Cleanup (assistant + vector store + file deletion) runs on `SIGTERM`.

**Rationale**:
- Pattern mirrors `src/02_file_search.js` exactly — upload → vector store → assistant →
  thread → run → messages — satisfying the constitution's Foundry pattern requirement.
- Creating the agent once avoids re-uploading the 5-page PDF on every request (~10–20 s
  upload + indexing latency).
- Discarding threads after each request prevents unbounded resource accumulation and keeps
  server state minimal.
- Seeding threads with prior history rather than maintaining a persistent thread keeps the
  server stateless per request, matching the "in-memory only" spec constraint.

**Alternatives considered**:
- Create agent per request — rejected: 10–20 s latency per message violates the ≤ 5 s
  response requirement.
- Persist vector store ID to `.foundry-state.json` between restarts — deferred to Phase 2;
  adds file I/O, staleness checks, and error-handling complexity inappropriate for a PoC.
- Maintain a persistent thread per browser session — rejected: requires session management
  and cleanup logic that contradicts the "no database" constraint.

---

## Decision 4: Chat History — Frontend-Owned Sliding Window

**Decision**: The browser holds an in-memory `ChatMessage[]` array (max 10 items = 5 turns).
On each send, `chat.js` trims to the last 10 entries, passes `history` to the server, and
the server seeds a new Assistants thread with those messages before appending the new user
message. The array is discarded on page refresh.

**Rationale**:
- Directly implements FR-003 (5-turn context) and FR-004 (in-memory only, resets on refresh).
- Frontend owns conversation state; the server is stateless across requests — no session
  mapping or cleanup required.
- Seeding threads with prior turns gives the Foundry assistant context without maintaining
  a long-lived server-side thread.

**Alternatives considered**:
- Server-maintained thread with pruning — rejected: requires server-side session state
  (maps browser sessions to thread IDs) and an eviction strategy.
- Always send full history — rejected: token cost grows unbounded; violates Performance
  principle (≤ 200 KB, API efficiency).

---

## Decision 5: Testing Toolchain — Vitest

**Decision**: Vitest for all unit and integration tests. Unit tests in `tests/unit/`
require no credentials. Integration tests in `tests/integration/` are gated by a `.env`
check and skipped gracefully when credentials are absent (e.g., in CI without secrets).

**Rationale**:
- Vitest is Vite's native test runner; zero additional configuration when `vite.config.js`
  already exists.
- ES module compatible; no Babel transform required.
- Fast watch mode well-suited to TDD (Constitution Principle II).

**Alternatives considered**:
- Jest — rejected: requires `babel-jest` or ESM shim config; no native Vite integration.
- Mocha + Chai — rejected: more setup boilerplate; no native Vite integration.

---

## Decision 6: Authentication — Reuse `src/_config.js`

**Decision**: `server/foundry.js` imports `getConfig()` from `../src/_config.js` (the
existing shared config helper) to read `FOUNDRY_API_KEY`, `FOUNDRY_ENDPOINT`,
`FOUNDRY_DEPLOYMENT_AGENT`, etc. from `.env`. No new config module is created.

**Rationale**:
- Constitution Principle I: "Environment configuration MUST flow through `src/_config.js`."
- Meeting transcript mandates API key auth — `getConfig()` already validates and exposes
  `apiKey` with a clear error if missing or placeholder.
- Reusing the existing helper avoids duplication (Code Quality principle).

**Alternatives considered**:
- Read `process.env` directly in `foundry.js` — rejected: violates Code Quality principle,
  bypasses the placeholder-value guard in `required()`.
- New `server/config.js` — rejected: duplicates `src/_config.js`.
