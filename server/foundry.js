"use strict";

const fs = require("fs");
const path = require("path");
const { AzureOpenAI } = require("openai");
const { getConfig } = require("../src/_config.js");

const PDF_PATH = path.resolve(__dirname, "..", "data", "thai_leave_policy.pdf");
const ASSISTANTS_API_VERSION = "2025-01-01-preview";

function buildClient() {
  const cfg = getConfig();
  return {
    cfg,
    client: new AzureOpenAI({
      endpoint: cfg.endpoint,
      apiKey: cfg.apiKey,
      apiVersion: ASSISTANTS_API_VERSION,
    }),
  };
}

async function uploadAndIndex(client, pdfPath = PDF_PATH) {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Expected PDF at ${pdfPath}`);
  }

  const file = await client.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants",
  });

  const vectorStore = await client.vectorStores.create({
    name: "thai-leave-policy-vs",
  });

  await client.vectorStores.fileBatches.createAndPoll(vectorStore.id, {
    file_ids: [file.id],
  });

  return {
    fileId: file.id,
    vectorStoreId: vectorStore.id,
  };
}

async function createAgent(client, vectorStoreId) {
  const cfg = getConfig();
  const assistant = await client.beta.assistants.create({
    name: "thai-leave-policy-agent",
    instructions:
      "คุณคือผู้ช่วย HR ของกระทรวงการคลัง ตอบเป็นภาษาไทย โดยอ้างอิงข้อมูลจากเอกสารนโยบายการลาเท่านั้น หากไม่พบข้อมูลให้บอกตามตรง",
    model: cfg.agentDeployment,
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStoreId],
      },
    },
  });

  return {
    assistantId: assistant.id,
  };
}

async function query(client, assistantId, message, history = []) {
  const seeded = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))
    : [];

  const thread = await client.beta.threads.create({
    messages: [...seeded, { role: "user", content: message }],
  });

  try {
    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
    });

    if (run.status === "failed") {
      throw new Error("Foundry run failed");
    }

    const messages = await client.beta.threads.messages.list(thread.id, {
      order: "desc",
    });

    const assistantMessage = messages.data.find((m) => m.role === "assistant");
    const textPart = assistantMessage?.content?.find((c) => c.type === "text");
    const reply = textPart?.text?.value?.trim();

    if (!reply) {
      throw new Error("Empty assistant response");
    }

    return reply;
  } finally {
    await client.beta.threads.del(thread.id).catch(() => {});
  }
}

async function cleanup(client, session) {
  if (!client || !session) {
    return;
  }

  if (session.assistantId) {
    await client.beta.assistants.del(session.assistantId).catch(() => {});
  }
  if (session.vectorStoreId) {
    await client.vectorStores.del(session.vectorStoreId).catch(() => {});
  }
  if (session.fileId) {
    await client.files.del(session.fileId).catch(() => {});
  }
}

module.exports = {
  ASSISTANTS_API_VERSION,
  buildClient,
  uploadAndIndex,
  createAgent,
  query,
  cleanup,
};
