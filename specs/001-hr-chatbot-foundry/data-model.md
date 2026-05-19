# Data Model: MOF HR Chat

**Feature**: `001-hr-chatbot-foundry` | **Phase**: 1 — Design | **Date**: 2026-05-19

---

## Frontend (Browser Memory — `app/chat.js`)

### ChatMessage

A single message in the conversation. Constructed by `chat.js`; never persisted.

| Field | Type | Constraints |
|-------|------|-------------|
| `role` | `'user' \| 'assistant'` | Required |
| `content` | `string` | Required, non-empty |
| `timestamp` | `Date` | Auto-set to `new Date()` on creation |

### ConversationHistory

In-memory array of `ChatMessage` objects managed entirely by `app/chat.js`.

| Attribute | Value |
|-----------|-------|
| Type | `ChatMessage[]` |
| Max length | 10 items (5 user + 5 assistant turns) |
| Persistence | None — discarded on page refresh or tab close |
| Trimming rule | When adding a new pair would exceed 10 items, drop the two oldest entries (1 user + 1 assistant turn) before appending |

**State transitions**:
```
EMPTY
  → user sends → [ user_1 ]
  → assistant replies → [ user_1, asst_1 ]
  → ...repeats up to [ user_5, asst_5 ] (10 items)
  → user sends again → drop user_1 + asst_1 → append user_6 → [ user_2, asst_2, ..., user_6 ]
  → assistant replies → append asst_6 → [ user_2, asst_2, ..., user_6, asst_6 ]  (10 items)
```

**Pure functions exported by `app/chat.js`**:

| Function | Signature | Description |
|----------|-----------|-------------|
| `addMessage` | `(history, role, content) → ChatMessage[]` | Appends message and trims to max 10 |
| `trimHistory` | `(history, maxItems) → ChatMessage[]` | Returns last `maxItems` entries |
| `formatForAPI` | `(history) → { role, content }[]` | Strips `timestamp`; returns plain objects for JSON |

---

## Server (In-Memory Process State — `server/foundry.js`)

### FoundrySession

Singleton created at server startup. Lives for the duration of the `node server/index.js`
process. Cleaned up (resources deleted from Azure) on `SIGTERM` / `SIGINT`.

| Field | Type | Description |
|-------|------|-------------|
| `fileId` | `string` | Azure Foundry file ID for the uploaded PDF |
| `vectorStoreId` | `string` | Vector store that indexes the PDF |
| `assistantId` | `string` | AI assistant attached to the vector store |
| `ready` | `boolean` | `true` once upload + indexing + assistant creation complete |

**Lifecycle**:
```
server start
  → uploadAndIndex()  →  fileId + vectorStoreId (ready=false)
  → createAgent()     →  assistantId (ready=true)
  → [handle requests]
  → SIGTERM/SIGINT    →  deleteAgent() + deleteVectorStore() + deleteFile()
```

### ChatRequest (API input — transient, per request)

Constructed from the `POST /api/chat` request body. Not stored.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `message` | `string` | Yes | Non-empty; max 2000 characters |
| `history` | `{ role, content }[]` | No | Max 10 items; roles must be `'user'` or `'assistant'` |

**Thread seeding**: The server creates a new Assistants thread by combining `history`
(up to 10 items) with the new `message` as the final user turn. The thread is discarded
after the run completes.

### ChatResponse (API output — transient)

| Field | Type | Description |
|-------|------|-------------|
| `reply` | `string` | Thai-language answer from the Foundry assistant |

### ErrorResponse (API output — transient)

| Field | Type | Description |
|-------|------|-------------|
| `error` | `string` | User-facing Thai-language error message (never a raw stack trace) |

**Standard error messages**:

| Scenario | `error` value |
|----------|---------------|
| Empty `message` | `"กรุณากรอกข้อความก่อนส่ง"` |
| Server still initialising | `"ระบบกำลังเตรียมพร้อม กรุณารอสักครู่แล้วลองใหม่"` |
| Foundry unreachable | `"ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง"` |
| Unexpected server error | `"เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง"` |

---

## Knowledge Base (Read-Only — `data/`)

### HRPolicyDocument

Static file; never created or modified by the application at runtime.

| Attribute | Value |
|-----------|-------|
| File | `data/thai_leave_policy.pdf` |
| Language | Thai |
| Content | HR leave policy: maternity, annual, sick leave, and related procedures |
| Indexed by | Azure Foundry File Search (vector store) — uploaded once at server start |
| Access pattern | Read-only, queried via Foundry `file_search` tool |
| Modification | Out of scope — adding new documents is a Phase 2 enhancement |
