"use strict";

const express = require("express");
const foundry = require("./foundry");

const ERROR_EMPTY_MESSAGE = "กรุณากรอกข้อความก่อนส่ง";
const ERROR_INITIALISING = "ระบบกำลังเตรียมพร้อม กรุณารอสักครู่แล้วลองใหม่";
const ERROR_CONNECT = "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง";
const ERROR_INTERNAL = "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง";

const app = express();
app.use(express.json());

const session = {
  ready: false,
  fileId: null,
  vectorStoreId: null,
  assistantId: null,
};

let client;

async function initialise() {
  const built = foundry.buildClient();
  client = built.client;

  const indexed = await foundry.uploadAndIndex(client);
  session.fileId = indexed.fileId;
  session.vectorStoreId = indexed.vectorStoreId;

  const agent = await foundry.createAgent(client, session.vectorStoreId);
  session.assistantId = agent.assistantId;
  session.ready = true;
  console.log("✅ Foundry agent ready");
}

app.get("/api/health", (req, res) => {
  if (session.ready) {
    return res.status(200).json({ status: "ready" });
  }
  return res.status(503).json({ status: "initialising" });
});

app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!message) {
    return res.status(400).json({ error: ERROR_EMPTY_MESSAGE });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: ERROR_EMPTY_MESSAGE });
  }

  if (!session.ready) {
    return res.status(503).json({ error: ERROR_INITIALISING });
  }

  try {
    const reply = await foundry.query(client, session.assistantId, message, history);
    return res.status(200).json({ reply });
  } catch (error) {
    const code = Number(error?.status || error?.code || 0);
    if (code === 429 || code >= 500) {
      return res.status(503).json({ error: ERROR_CONNECT });
    }
    return res.status(500).json({ error: ERROR_INTERNAL });
  }
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  await foundry.cleanup(client, session);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

const PORT = 3001;
app.listen(PORT, () => {
  initialise().catch(() => {
    session.ready = false;
  });
});
