# API Contract: MOF HR Chat

**Feature**: `001-hr-chatbot-foundry` | **Phase**: 1 — Design | **Date**: 2026-05-19
**Server**: `http://localhost:3001` (local only)
**Frontend proxy**: Vite proxies `/api/*` → `http://localhost:3001`

All request and response bodies are JSON (`Content-Type: application/json`).
All error messages in responses are Thai-language strings safe to display directly in the UI.

---

## POST /api/chat

Submit a user message with optional conversation history. Returns the assistant's reply
grounded in the HR policy document.

### Request

```
POST /api/chat
Content-Type: application/json
```

```json
{
  "message": "พนักงานหญิงลาคลอดได้กี่วัน",
  "history": [
    { "role": "user",      "content": "สวัสดีครับ มีคำถามเรื่องการลา" },
    { "role": "assistant", "content": "สวัสดีครับ ยินดีช่วยเหลือครับ มีเรื่องอะไรให้ช่วยไหมครับ" }
  ]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `message` | `string` | Yes | Non-empty string; max 2000 characters |
| `history` | `array` | No | Max 10 items; each item must have `role` (`"user"` or `"assistant"`) and `content` (non-empty string) |

### Response — 200 OK

```json
{
  "reply": "พนักงานหญิงมีสิทธิ์ลาคลอดก่อนและหลังคลอดบุตรรวมกันไม่เกิน 98 วัน..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `reply` | `string` | Thai-language answer grounded in the HR policy document |

### Response — 400 Bad Request

Returned when `message` is absent, empty, or exceeds 2000 characters.

```json
{
  "error": "กรุณากรอกข้อความก่อนส่ง"
}
```

### Response — 503 Service Unavailable

Returned when the Foundry agent is still initialising or when the Foundry service is
unreachable.

```json
{
  "error": "ระบบกำลังเตรียมพร้อม กรุณารอสักครู่แล้วลองใหม่"
}
```

or

```json
{
  "error": "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง"
}
```

### Response — 500 Internal Server Error

Returned for unexpected server-side errors.

```json
{
  "error": "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง"
}
```

---

## GET /api/health

Returns the current initialisation state of the Foundry agent. Intended for use during
startup (the frontend polls this before enabling the input field).

### Response — 200 OK (agent ready)

```json
{ "status": "ready" }
```

### Response — 503 Service Unavailable (still initialising)

```json
{ "status": "initialising" }
```

---

## Implementation Notes (for `server/index.js`)

- Both endpoints MUST set `Content-Type: application/json` on all responses.
- `POST /api/chat` MUST validate `message` before calling `foundry.query()`.
- If `foundry.session.ready === false`, `POST /api/chat` MUST return 503 immediately
  without calling Foundry.
- Raw errors from the `openai` SDK MUST be caught and translated to the appropriate
  Thai error string; stack traces MUST NOT be forwarded to the client.
- CORS headers are not required (Vite proxy handles cross-origin in development;
  production is not in scope).
