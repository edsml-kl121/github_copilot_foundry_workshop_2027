# Quickstart: MOF HR Chat

**Feature**: `001-hr-chatbot-foundry` | **Date**: 2026-05-19

---

## Prerequisites

- **Node.js 20+** — `node --version`
- **An Azure AI Foundry resource** with:
  - A deployed chat/agent model (e.g. `gpt-4o-mini`)
  - Assistants v2 API enabled (`2025-01-01-preview` or later)
- A copy of this repository checked out on `001-hr-chatbot-foundry`

---

## 1. Configure Credentials

```bash
cp .env.template .env
```

Edit `.env` and fill in your values:

```
FOUNDRY_ENDPOINT=https://<your-resource>.openai.azure.com/
FOUNDRY_API_KEY=<your-api-key>
FOUNDRY_PROJECT_ENDPOINT=https://<your-project>.api.azureml.ms
FOUNDRY_DEPLOYMENT_AGENT=gpt-4o-mini
FOUNDRY_API_VERSION=2025-01-01-preview
```

> The `.env` file is in `.gitignore`. Never commit it.

---

## 2. Install Dependencies

```bash
npm install
```

New packages added for this feature: `vite`, `express`, `concurrently`, `vitest`.

---

## 3. Start the Application

```bash
npm run dev
```

This starts two processes concurrently:
- **Vite dev server** on `http://localhost:5173` — serves the frontend SPA
- **Express API server** on `http://localhost:3001` — manages the Foundry agent

On first start the server will:
1. Upload `data/thai_leave_policy.pdf` to Azure Foundry
2. Create a vector store and index the PDF (~10–30 s depending on service)
3. Create the AI assistant attached to the vector store

Watch for `✅ Foundry agent ready` in the terminal before sending queries.

---

## 4. Open the Chatbot

Navigate to **`http://localhost:5173`** in your browser.

The input field is disabled until the backend reports `{ "status": "ready" }`.

**Example questions (Thai)**:

| Thai | English |
|------|---------|
| สวัสดีครับ | Hello |
| พนักงานหญิงลาคลอดได้กี่วัน | How many days maternity leave? |
| ลาป่วยได้กี่วันต่อปี | How many sick days per year? |
| การลาพักผ่อนมีเงื่อนไขอะไรบ้าง | What are the annual leave conditions? |

---

## 5. Run Tests

```bash
npm test                    # all tests
npm run test:unit           # unit tests only (no credentials required)
npm run test:integration    # live Foundry roundtrip — requires valid .env
```

---

## Project Layout (quick reference)

```
index.html          SPA entry (Vite)
vite.config.js      Proxy /api/* → localhost:3001
app/
  main.js           Chat UI event handlers
  chat.js           In-memory history management (pure functions)
  api.js            fetch wrapper for POST /api/chat
  style.css         Blue/white theme
server/
  index.js          Express server + startup sequence
  foundry.js        Foundry agent lifecycle (upload, create, query, cleanup)
tests/
  unit/chat.test.js           Pure function tests
  integration/foundry.test.js Live API roundtrip test
src/                          EXISTING examples — do not modify
data/thai_leave_policy.pdf    HR knowledge base
```

---

## Troubleshooting

| Symptom | Solution |
|---------|----------|
| `Missing or placeholder value for FOUNDRY_API_KEY` | Check `.env` contains real values, not placeholders |
| Backend stuck on `initialising` for > 60 s | Verify endpoint URL and API key; check Azure quota and region |
| Browser shows Thai error message | Check terminal output on the Express server for details; restart with `npm run dev` |
| Input field stays disabled after page load | Backend may still be indexing — wait for `✅ Foundry agent ready` |
| Answers appear in English | Check system prompt in `server/foundry.js` includes Thai-language instruction |
| `npm run dev` not found | Run `npm install` first to add `vite` and `concurrently` |
