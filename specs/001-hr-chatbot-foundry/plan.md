# Implementation Plan: MOF HR Chat — HR Policy Chatbot

**Branch**: `001-hr-chatbot-foundry` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-hr-chatbot-foundry/spec.md`

## Summary

Build "MOF HR แชท" — a Thai-language HR policy chatbot for the Ministry of Finance HR team.
A Vite-served vanilla HTML/CSS/JS single-page app communicates with a local Express API bridge
that manages an Azure AI Foundry agent backed by the `thai_leave_policy.pdf` document via the
File Search tool. Conversation history is held in browser memory (5-turn sliding window); no
database is required.

## Technical Context

**Language/Version**: JavaScript ES2022+, Node.js 20+

**Primary Dependencies**: `vite` (dev server/bundler), `express` (local API bridge),
`openai` ≥ 4.73 (AzureOpenAI — already installed), `dotenv` (already installed),
`concurrently` (single `npm run dev` command), `vitest` (test runner)

**Storage**: In-memory JavaScript array in the browser — no database. Server holds Foundry
agent/vector-store IDs in memory for the duration of the server process.

**Testing**: Vitest — unit tests for pure frontend functions; integration test for the
Foundry agent roundtrip

**Target Platform**: Desktop web browser (Chrome / Firefox / Safari), localhost

**Project Type**: Web application (SPA frontend + local Express API bridge)

**Performance Goals**: First meaningful paint ≤ 2 s; first assistant response ≤ 5 s;
JS bundle ≤ 200 KB gzip (excl. vendor chunks for `openai` SDK)

**Constraints**: API key auth only (no Entra ID / az login); conversation history in browser
memory only; no cloud deployment; PDF already present in `/data`

**Scale/Scope**: 1–2 concurrent users, single local machine, Proof-of-Concept

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality | Vanilla JS/HTML/CSS — no frameworks; config via `src/_config.js`; Foundry pattern mirrors `02_file_search.js` | ✅ PASS |
| II. Testing Standards | Unit tests planned for `chat.js` pure functions; integration test planned for Foundry agent path | ✅ PASS |
| III. UX Consistency | Single CSS file with custom properties; loading indicator; Thai error messages; disclaimer always anchored | ✅ PASS |
| IV. Performance | Vite bundle ≤ 200 KB gzip; agent created once per server session; first paint ≤ 2 s; response ≤ 5 s | ✅ PASS |

No violations. Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/001-hr-chatbot-foundry/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── api.md           # Phase 1 output — REST API contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT generated here)
```

### Source Code (repository root)

```text
index.html               # Vite entry point — chat SPA shell
vite.config.js           # proxy /api/* → http://localhost:3001

app/
├── main.js              # Chat UI: event handlers, DOM manipulation, app init
├── chat.js              # Pure: in-memory history management (add, trim, format)
├── api.js               # Fetch wrapper: POST /api/chat → { reply } | { error }
└── style.css            # Blue/white theme, responsive, CSS custom properties

server/
├── index.js             # Express entry: initialises Foundry on start, serves POST /api/chat
└── foundry.js           # Foundry lifecycle: uploadAndIndex(), createAgent(), query()

tests/
├── unit/
│   └── chat.test.js     # Pure function tests: addMessage, trimHistory, formatForAPI
└── integration/
    └── foundry.test.js  # Live Foundry roundtrip — requires .env (skipped without creds)

src/                     # EXISTING examples — do not modify
├── _config.js           # Reused by server/foundry.js via require('../src/_config')
├── 01_basic_chat.js
├── 02_file_search.js
└── 03_image.js

data/
└── thai_leave_policy.pdf  # Knowledge base (existing)
```

**Structure Decision**: Web application layout (frontend `app/` + backend `server/`).
The existing `src/` examples are untouched; `server/foundry.js` reuses `src/_config.js`
to honour the Code Quality principle. A Vite proxy routes `/api/*` to Express, keeping the
frontend free of CORS concerns and the API key server-side only.
