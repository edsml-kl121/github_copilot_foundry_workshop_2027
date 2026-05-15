# API Contract: MOF HR Chatbot

**Feature**: 001-mof-hr-chatbot
**Phase**: 1 — Design & Contracts
**Date**: 2026-05-15

**Transport**: HTTP/1.1 over localhost (Vite dev server, default port 5173)
**Format**: JSON request and response bodies
**Auth**: None (local-only PoC, trusted intranet users)

---

## Endpoints

### POST /api/chat

Send a user message and receive the assistant's Thai-language reply.

#### Request

```http
POST /api/chat HTTP/1.1
Content-Type: application/json
```

```json
{
  "message": "พนักงานมีสิทธิ์ลาพักร้อนได้กี่วัน?",
  "history": [
    { "role": "user",      "content": "สวัสดีครับ" },
    { "role": "assistant", "content": "สวัสดีครับ ยินดีให้บริการค่ะ มีคำถามเรื่อง HR อะไรให้ช่วยได้บ้างคะ?" }
  ]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `message` | `string` | Yes | Non-empty after trim; max 2000 characters |
| `history` | `array` | Yes | 0–10 items; each item must have `role` and `content`; server silently truncates to 10 items |
| `history[].role` | `"user" \| "assistant"` | Yes | Exactly one of these two values |
| `history[].content` | `string` | Yes | Non-empty string |

#### Response — Success (200)

```json
{
  "reply": "พนักงานประจำมีสิทธิ์ลาพักร้อนได้ 10 วันทำการต่อปี ตามระเบียบว่าด้วยการลาพักร้อน..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `reply` | `string` | Thai-language assistant answer grounded in HR documents |

#### Response — Validation Error (400)

```json
{
  "error": "message field is required and must be a non-empty string"
}
```

#### Response — Agent Not Ready / Initialization Error (503)

```json
{
  "error": "HR agent is initialising, please retry in a moment"
}
```

#### Response — Foundry API Timeout (504)

```json
{
  "error": "The agent did not respond within 30 seconds. Please try again."
}
```

#### Response — Internal Error (500)

```json
{
  "error": "An unexpected error occurred. Please contact the IT team."
}
```

---

### GET /api/health

Check whether the Foundry agent has been initialised and is ready to accept questions.

#### Request

```http
GET /api/health HTTP/1.1
```

#### Response — Ready (200)

```json
{
  "status": "ok",
  "agentReady": true
}
```

#### Response — Initialising (200)

```json
{
  "status": "ok",
  "agentReady": false
}
```

*Note*: Returns HTTP 200 in both cases. The frontend uses `agentReady: false` to show
a "กำลังเตรียมระบบ…" (system initialising) message and disable the input.

---

## Client–Server Interaction Diagram

```
Browser (app/main.js)                   Vite middleware (server/foundry.js)
        │                                          │
        │  page load                               │
        │  ───────────────────────────────────►   │
        │                           GET /api/health│
        │  ◄─── { agentReady: false } ────────────│
        │  (show loading state)                    │
        │                                          │
        │  user types a question                   │
        │  ───────────────────────────────────►   │
        │               POST /api/chat             │
        │          { message, history: [] }        │
        │                                          │  lazy init (first request only)
        │                                          │  upload PDF → vector store → agent
        │                                          │
        │                                          │  create Foundry thread
        │                                          │  add history messages to thread
        │                                          │  add user message to thread
        │                                          │  runs.createAndPoll(threadId, agentId)
        │                                          │  extract assistant reply
        │                                          │
        │  ◄─── { reply: "..." } ─────────────────│
        │  (append to UI, update history)          │
        │                                          │
        │  user types follow-up question           │
        │  ───────────────────────────────────►   │
        │               POST /api/chat             │
        │        { message, history: [2 msgs] }    │
        │                                          │  (agent already cached)
        │                                          │  new thread, replay history, run
        │  ◄─── { reply: "..." } ─────────────────│
```

---

## Error Handling Contract

The frontend (`app/main.js`) MUST handle the following scenarios:

| HTTP Status | `error` field | UI Action |
|-------------|---------------|-----------|
| 400 | Validation message | Show inline error banner; keep input editable |
| 503 | Initialising message | Show "กำลังเตรียมระบบ…" and retry after 3 s |
| 504 | Timeout message | Show timeout error; allow user to resend |
| 500 | Generic error | Show generic error; suggest contacting IT |
| Network failure | N/A (fetch throws) | Show "ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง" |

---

## Versioning Policy

This contract is at **v1.0.0** (initial PoC). Breaking changes to request or response
shapes require a MAJOR version bump to the overall application, per the constitution
governance policy. For Phase 1 (PoC), the contract is internal-only and no external
consumers exist.
