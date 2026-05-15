# Data Model: MOF HR Chatbot

**Feature**: 001-mof-hr-chatbot
**Phase**: 1 — Design & Contracts
**Date**: 2026-05-15

---

## Overview

All state is ephemeral (in-memory only). There are no database tables, no persistent
stores, and no schema migrations. The data model describes the runtime structures used
by the frontend (browser memory) and the server module (Node.js process memory).

---

## Client-Side Entities (browser memory)

### ChatMessage

Represents one message in the visible conversation thread.

| Field | Type | Description |
|-------|------|-------------|
| `role` | `"user" \| "assistant"` | Who sent the message |
| `content` | `string` | Thai-language message text |

**Constraints**:
- `content` must be non-empty after trimming whitespace
- `role` must be exactly `"user"` or `"assistant"` (lowercase)

**Validation rules**:
- User messages are trimmed before submission; blank messages are silently ignored
- Assistant messages are set by the server response only; never generated client-side

---

### ConversationHistory

A sliding window of the last `MAX_TURNS` (5) full turns retained in browser memory.

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `ChatMessage[]` | Ordered array, oldest first, newest last |

**State transitions**:

```
EMPTY (app load)
    │
    │  user sends first message
    ▼
PENDING (waiting for assistant reply)
    │
    │  server responds
    ▼
ACTIVE (1 turn in history)
    │
    │  user sends another message
    ▼
PENDING ...
    │
    │  (repeat)
    ▼
FULL (5 turns = 10 messages)
    │
    │  user sends another message → oldest 2 messages (1 turn) are evicted
    ▼
ACTIVE (still 5 turns, window shifted)
```

**Sliding window rule**:
- Maximum retained messages = `MAX_TURNS * 2` = 10
- When a new assistant reply is appended and the length exceeds 10, the oldest
  `messages[0]` and `messages[1]` are removed (one full turn evicted per overflow)

---

### UIState

Transient UI state managed in `app/main.js`.

| Field | Type | Description |
|-------|------|-------------|
| `isLoading` | `boolean` | `true` while awaiting server response |
| `agentReady` | `boolean` | `true` once server has initialized the Foundry agent |
| `errorMessage` | `string \| null` | Current error banner text, `null` when no error |

---

## Server-Side Entities (Node.js process memory)

### FoundryAgentContext

Singleton object cached in `server/foundry.js` after first initialization. Never
serialized or persisted. Lost when the Vite dev server process exits.

| Field | Type | Description |
|-------|------|-------------|
| `client` | `AgentsClient` | Authenticated Azure AI Foundry client |
| `agentId` | `string` | ID of the provisioned Foundry agent |
| `vectorStoreId` | `string` | ID of the vector store containing the HR PDF |
| `fileId` | `string` | ID of the uploaded `thai_leave_policy.pdf` in Azure |
| `initialized` | `boolean` | `false` until all three IDs are obtained |

**Initialization sequence** (lazy, on first `/api/chat` request):

```
initialized = false
    │
    │  POST /api/chat received and initialized === false
    ▼
Upload thai_leave_policy.pdf → fileId
    │
    ▼
Create vector store ({ fileIds: [fileId] }) → vectorStoreId
    │
    ▼
Create agent (file search tool, Thai system prompt) → agentId
    │
    ▼
initialized = true
    │
    ▼
Process the pending /api/chat request
```

**Cleanup** (on SIGINT/SIGTERM):

```
deleteAgent(agentId)
vectorStores.delete(vectorStoreId)
files.delete(fileId)
```

---

### ChatRequest (API boundary object)

Deserialized from the incoming POST `/api/chat` request body.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | Yes | The new user question (non-empty, trimmed) |
| `history` | `ChatMessage[]` | Yes | Previous turns, 0–10 items, oldest first |

**Validation rules**:
- `message`: must be a non-empty string after trim; max 2000 characters
- `history`: must be an array; each item must have `role` ∈ `{"user","assistant"}`
  and a non-empty `content` string; maximum 10 items (5 turns); excess items are
  silently truncated server-side as a safety net

---

### ChatResponse (API boundary object)

Serialized to the outgoing POST `/api/chat` response body.

| Field | Type | Description |
|-------|------|-------------|
| `reply` | `string` | The assistant's Thai-language answer |

**Error response** (non-2xx HTTP status):

| Field | Type | Description |
|-------|------|-------------|
| `error` | `string` | Human-readable description of what failed |

---

## System Prompt (agent instructions)

The system prompt is a named constant in `server/foundry.js`. It enforces Thai language
and semi-formal tone as required by FR-003 and the meeting transcript.

```
คุณคือผู้ช่วย HR ของ MOF HR แชท ซึ่งให้บริการตอบคำถามเกี่ยวกับนโยบาย HR
ของกระทรวงการคลัง กรุณาตอบด้วยภาษาไทยแบบกึ่งทางการเท่านั้น (ไม่ทางการ
จนเกินไปและไม่ลำลองจนเกินไป) ตอบโดยอ้างอิงจากเอกสารที่แนบมาเท่านั้น
หากไม่พบข้อมูลในเอกสาร ให้แจ้งว่าไม่พบข้อมูลและแนะนำให้ติดต่อฝ่าย HR โดยตรง
```

*(Translation: "You are the HR assistant of MOF HR Chat, answering HR policy questions
for the Ministry of Finance. Reply only in semi-formal Thai. Base your answers on the
attached documents only. If no relevant information is found, say so and recommend
contacting HR staff directly.")*

---

## Constants

| Name | Value | Location | Purpose |
|------|-------|----------|---------|
| `MAX_TURNS` | `5` | `app/main.js` | Max conversation turns retained client-side |
| `MAX_HISTORY_MESSAGES` | `10` | `server/foundry.js` | Server-side safety cap on history array |
| `MAX_MESSAGE_LENGTH` | `2000` | `server/foundry.js` | Max chars per user message |
| `AGENT_RUN_TIMEOUT_MS` | `30000` | `server/foundry.js` | Agent poll timeout (30 s per SC-001) |
| `POLL_INTERVAL_MS` | `2000` | `server/foundry.js` | Matches `02_file_search.js` poll interval |
| `PDF_PATH` | `data/thai_leave_policy.pdf` | `server/foundry.js` | HR document path |
