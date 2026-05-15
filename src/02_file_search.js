// Example 2 — Foundry Agent with the File Search tool.
//
// Uploads data/thai_leave_policy.pdf into a vector store, attaches it to an
// assistant, asks a grounded question, then cleans up.
//
// Auth: API key (FOUNDRY_API_KEY in .env) — no az login required.
// Run:  npm run example:2
"use strict";

const fs = require("fs");
const path = require("path");
const { AzureOpenAI } = require("openai");
const { getConfig } = require("./_config");

const PDF_PATH = path.resolve(__dirname, "..", "data", "thai_leave_policy.pdf");
// Assistants v2 with file search requires a preview API version
const ASSISTANTS_API_VERSION = "2025-01-01-preview";

async function main() {
  const cfg = getConfig();

  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`Expected PDF at ${PDF_PATH}`);
  }

  console.log(`>> Endpoint:    ${cfg.endpoint}`);
  console.log(`>> Deployment:  ${cfg.agentDeployment}`);

  const client = new AzureOpenAI({
    endpoint: cfg.endpoint,
    apiKey: cfg.apiKey,
    apiVersion: ASSISTANTS_API_VERSION,
  });

  console.log(">> Uploading PDF…");
  const file = await client.files.create({
    file: fs.createReadStream(PDF_PATH),
    purpose: "assistants",
  });
  console.log(`   file ID: ${file.id}`);

  console.log(">> Creating vector store…");
  const vectorStore = await client.vectorStores.create({ name: "thai-leave-policy-vs" });
  console.log(`   vector store ID: ${vectorStore.id}`);

  console.log(">> Indexing PDF into vector store (polling until ready)…");
  await client.vectorStores.fileBatches.createAndPoll(vectorStore.id, {
    file_ids: [file.id],
  });
  console.log("   ready");

  console.log(">> Creating assistant…");
  const assistant = await client.beta.assistants.create({
    name: "thai-leave-policy-agent",
    instructions:
      "You are an HR assistant. Answer ONLY using the attached Thai leave policy document. Cite the relevant section if possible.",
    model: cfg.agentDeployment,
    tools: [{ type: "file_search" }],
    tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
  });
  console.log(`   assistant ID: ${assistant.id}`);

  try {
    const thread = await client.beta.threads.create({
      messages: [
        {
          role: "user",
          content:
            "How many days of annual leave is an employee entitled to, and what are the conditions?",
        },
      ],
    });

    console.log(">> Running assistant…");
    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });
    console.log(`   status=${run.status}`);
    if (run.status === "failed") {
      console.error("   error:", run.last_error);
      return;
    }

    const messages = await client.beta.threads.messages.list(thread.id, { order: "asc" });
    console.log("\n--- Conversation ---");
    for (const m of messages.data) {
      const text = m.content.find((c) => c.type === "text");
      if (text) console.log(`[${m.role}] ${text.text.value}\n`);
    }
  } finally {
    console.log(">> Cleaning up assistant + vector store + file…");
    await client.beta.assistants.del(assistant.id).catch(() => {});
    await client.vectorStores.del(vectorStore.id).catch(() => {});
    await client.files.del(file.id).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
