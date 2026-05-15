# Quickstart: MOF HR แชท

**Feature**: 001-mof-hr-chatbot
**Date**: 2026-05-15

This guide gets you from a fresh clone to a running HR chatbot in about 5 minutes.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18 or later | `node --version` to verify |
| npm | 9 or later | bundled with Node.js |
| Azure AI Foundry credentials | — | Provided by your team lead (see below) |
| `data/thai_leave_policy.pdf` | — | Already in the repo; do not rename or move |

---

## Step 1: Configure credentials

```bash
cp .env.template .env
```

Open `.env` and fill in the values your team lead provides:

```dotenv
# From your team's credential block:
FOUNDRY_ENDPOINT=https://<your-resource>.openai.azure.com/
FOUNDRY_API_KEY=<your-api-key>
FOUNDRY_PROJECT_ENDPOINT=https://<your-resource>.services.ai.azure.com/api/projects/<project>
```

> The existing `.env.template` already contains the correct variable names.
> Do not commit `.env` to source control — it is in `.gitignore`.

---

## Step 2: Install dependencies

```bash
npm install
```

This installs Vite (added as a devDependency) alongside the existing Azure SDK packages.

---

## Step 3: Start the chatbot

```bash
npm run dev
```

Vite starts a local dev server. You will see output like:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open **http://localhost:5173** in your browser.

---

## Step 4: First question

On the first question you submit, the server:

1. Uploads `data/thai_leave_policy.pdf` to Azure AI Foundry (~5–10 s)
2. Creates a vector store and attaches the PDF (~5 s)
3. Creates the "MOF HR แชท" agent with the File Search tool

While initialising, the input shows "กำลังเตรียมระบบ…". After that, type your
question and press **Enter** or click the send button.

**Example questions to try**:
- `พนักงานมีสิทธิ์ลาพักร้อนได้กี่วัน?`
- `ขั้นตอนการลาป่วยทำอย่างไร?`
- `สวัสดิการพนักงานมีอะไรบ้าง?`

---

## Step 5: Stop the server

Press **Ctrl+C** in the terminal. The server automatically deletes the vector store,
uploaded file, and agent from Azure on shutdown.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Missing or placeholder value for FOUNDRY_PROJECT_ENDPOINT` | `.env` not filled in | Re-read Step 1 |
| `Expected PDF at …/data/thai_leave_policy.pdf` | PDF missing | Ensure the file exists at that path |
| Response never arrives (spinner runs > 30 s) | Network issue or quota | Check Azure portal; retry |
| Port 5173 already in use | Another Vite server running | Kill the other process or run `npm run dev -- --port 5174` |
| Thai characters display as boxes | Browser font | Ensure your OS has Thai font support (default on macOS/Windows) |

---

## Running Tests

```bash
npm run test          # unit tests + integration tests (Vitest)
npm run test:coverage  # with coverage report
```

> Integration tests require valid `.env` credentials and will make real Azure API calls.

---

## Project Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `vite` | Start the MOF HR Chat dev server |
| `npm run build` | `vite build` | Build static assets for production |
| `npm run test` | `vitest run` | Run all tests once |
| `npm run test:watch` | `vitest` | Run tests in watch mode |
| `npm run test:coverage` | `vitest run --coverage` | Run tests with coverage |
| `npm run lint` | `eslint .` | Check code quality |
| `npm run example:1` | `node src/01_basic_chat.js` | Original basic chat example |
| `npm run example:2` | `node src/02_file_search.js` | Original file search example |
| `npm run example:3` | `node src/03_image.js` | Original vision example |
