# Research: MOF HR Chatbot

**Feature**: 001-mof-hr-chatbot
**Phase**: 0 — Outline & Research
**Date**: 2026-05-15

---

## Decision 1: Build Tool & Serving Strategy

**Decision**: Use Vite 5 as the build tool and development server. The Vite `configureServer`
plugin hook adds a Node.js Express-free middleware layer directly inside the Vite dev process
to serve `/api/*` routes. No separate backend process is needed.

**Rationale**: The user explicitly requires Vite with minimal libraries and vanilla
HTML/CSS/JS. Vite's `configureServer` API allows adding Node.js middleware (with full
access to the Node.js runtime, file system, and Azure SDKs) inside the same process
that serves the frontend. This eliminates the need for Express or any separate HTTP
server. The Azure SDKs (`@azure/ai-agents`, `openai`'s `AzureOpenAI` client) already in
the project cannot run in a browser (they are Node.js-only), so server-side middleware
is required.

**Alternatives considered**:
- Separate Express.js backend + Vite frontend: Rejected — two processes, two ports, more
  complexity, and an extra library (`express`) violates the minimal-libraries constraint.
- Vite proxy to a standalone Node.js server: Rejected — same issue; still requires a
  separate backend process and an extra `http` or `express` server.
- Static file serving (no backend): Not viable — Azure credentials must stay server-side
  and the `@azure/ai-agents` SDK is Node.js-only.

---

## Decision 2: Azure AI Foundry Integration Pattern

**Decision**: Follow the `src/02_file_search.js` example pattern exactly:
1. Upload `data/thai_leave_policy.pdf` via `client.files.upload()`
2. Create a vector store via `client.vectorStores.create({ fileIds })`
3. Create an agent via `client.createAgent()` with `ToolUtility.createFileSearchTool()`
4. For each chat request: create a thread, add history messages + new user message,
   run the agent with `client.runs.createAndPoll()`, extract the assistant reply.

**Rationale**: The project already has `@azure/ai-agents` and `openai` (`AzureOpenAI`
client) installed. The `02_file_search.js` example demonstrates the exact pattern
needed for PDF-grounded question answering with API-key auth. Reusing this pattern
ensures consistency with the workshop codebase and avoids introducing new SDKs or
abstractions.

**Lazy initialization**: The agent (PDF upload + vector store + agent creation) is
initialized on the first `/api/chat` request, not at server startup. This keeps Vite's
startup time under 3 seconds (SC-005). Subsequent requests reuse the cached agent.

**Cleanup**: On server shutdown (SIGINT/SIGTERM), the vector store, uploaded file, and
agent are deleted from Azure via `.catch(() => {})` patterns to avoid blocking shutdown.

**Alternatives considered**:
- Pre-create agent in Azure portal and hardcode the agent ID: Simpler, but requires
  manual setup steps outside the codebase and doesn't self-contain the PoC.
- Use `AzureOpenAI` chat completions with the PDF content embedded in the system prompt:
  Rejected — the PDF could grow beyond token limits; Foundry File Search is the
  requirement from the meeting transcript.

---

## Decision 3: Conversation History (5-Turn Sliding Window)

**Decision**: Manage conversation history entirely on the client side (browser memory).
`app/main.js` maintains a `history` array of `{role, content}` objects. On each send,
the last `MAX_TURNS * 2` messages (= 10 messages = 5 full turns) are sent with the
request body to the server as `"history"`. The server creates a fresh Foundry thread per
request, replays the history messages into the thread, then adds the new user message
and runs the agent.

**Rationale**: Keeps the server stateless. No session affinity, no server-side storage.
The meeting transcript explicitly states "no long-term memory or database for chat
history." A stateless server is easier to test and reason about. Creating a new Foundry
thread per request is slightly less efficient than a persistent thread but is correct
for a PoC with 1-2 concurrent users.

**Constant**: `MAX_TURNS = 5` is defined as a named constant in `app/main.js` (never
a magic number), satisfying Constitution Principle I.

**Alternatives considered**:
- Persistent Foundry thread per browser session (threadId stored in sessionStorage):
  More efficient (single thread per session), but requires server to manage thread
  lifecycle and adds complexity. Also, trimming to 5 turns in a persistent thread
  requires deleting old messages from Foundry (not straightforward). Rejected for PoC.
- Server-side session with express-session or similar: Rejected — requires an external
  library and a DB or in-memory store, contradicting the minimal-libraries requirement.

---

## Decision 4: Authentication to Azure AI Foundry

**Decision**: Use **API-key authentication** via the `AzureOpenAI` client from the
`openai` package (same as the existing examples). The client is instantiated with
`{ endpoint, apiKey, apiVersion }` once in `server/foundry.js` and reused across
requests. The `FOUNDRY_ENDPOINT` and `FOUNDRY_API_KEY` environment variables (already
documented in `.env.template`) are used for configuration.

**Rationale**: Consistent with all three existing examples in the project — none of
them require `az login` or Microsoft Entra ID role assignments, which simplifies the
workshop setup. The existing `src/_config.js` pattern (load `.env`, validate required
vars) is replicated in the server module.

**Alternatives considered**: `DefaultAzureCredential` from `@azure/identity` was
rejected — it requires an interactive `az login` and an `Azure AI User` role grant on
the Foundry project, which adds friction for workshop participants and is unnecessary
when an API key is already provisioned.

---

## Decision 5: UI Architecture (Vanilla HTML/CSS/JS via Vite)

**Decision**: A single `index.html` at the project root is the Vite entry point.
UI logic lives in `app/main.js` (vanilla JS ES modules, no framework). Styles live in
`app/style.css` (vanilla CSS, no Tailwind, no CSS-in-JS). Blue-and-white color scheme
per meeting transcript decision 7 and the `data/UI_redesign.png` mockup.

**Key UI elements** (from meeting + mockup):
- Header bar with "MOF HR แชท" title in white text on blue background
- Scrollable message area with user (right-aligned, blue bubble) and assistant
  (left-aligned, white bubble with border) messages
- Fixed footer with text input, send button, and permanent disclaimer text
- Disclaimer: "ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง"

**Rationale**: Vanilla JS is sufficient for a chat UI with ~100 lines of logic.
Using a framework (React, Vue) would add ~200 KB to bundle size and introduce
unnecessary complexity for a PoC. Vite handles ES module bundling without framework.

**Alternatives considered**:
- React + Vite: Rejected — adds ~200 KB runtime, JSX compilation, hooks complexity;
  overkill for a PoC chat interface.
- Vue + Vite: Same objection as React.

---

## Decision 6: Testing Stack

**Decision**: Use Vitest (Vite-native test runner). No separate Jest config needed —
Vitest runs via `vite.config.js`. Unit tests cover the sliding-window history utility.
Integration tests cover the `/api/chat` server middleware.

**Rationale**: Vitest is the natural testing partner for Vite projects. It shares the
same Vite config and plugin ecosystem. It supports ES modules natively without
transformation.

**Alternatives considered**:
- Jest: Rejected — requires additional Babel/ESM config and doesn't integrate with
  Vite's plugin system. Extra setup complexity for no benefit in this context.

---

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---------|-----------|
| Backend/API serving strategy | Vite `configureServer` middleware plugin |
| Foundry API integration pattern | Follow `src/02_file_search.js` exactly |
| Session state management | Client-side `history` array, sent per-request |
| Foundry thread lifecycle | New thread per chat request (stateless server) |
| Authentication | API key via `AzureOpenAI` client (existing pattern) |
| UI framework | None — vanilla HTML/CSS/JS |
| Test runner | Vitest |
| Lazy vs eager agent init | Lazy (first request), cached in server memory |
