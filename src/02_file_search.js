// Example 2 — Foundry Agent with the File Search tool.
//
// Uploads data/thai_leave_policy.pdf into a vector store, attaches it to a
// Foundry agent, asks a grounded question, then cleans up.
//
// Auth: DefaultAzureCredential (run `az login` first).
// Run:  npm run example:2
"use strict";

const fs = require("fs");
const path = require("path");
const { AgentsClient, ToolUtility } = require("@azure/ai-agents");
const { DefaultAzureCredential } = require("@azure/identity");
const { getConfig, required } = require("./_config");

const PDF_PATH = path.resolve(__dirname, "..", "data", "thai_leave_policy.pdf");

async function main() {
  const cfg = getConfig();
  required("FOUNDRY_PROJECT_ENDPOINT");

  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`Expected PDF at ${PDF_PATH}`);
  }

  console.log(`>> Project endpoint: ${cfg.projectEndpoint}`);
  console.log(`>> Using deployment: ${cfg.agentDeployment}`);

  const client = new AgentsClient(cfg.projectEndpoint, new DefaultAzureCredential());

  console.log(">> Uploading PDF…");
  const file = await client.files.upload(fs.createReadStream(PDF_PATH), "assistants", {
    fileName: path.basename(PDF_PATH),
  });
  console.log(`   file ID: ${file.id}`);

  console.log(">> Creating vector store…");
  const vectorStore = await client.vectorStores.create({
    fileIds: [file.id],
    name: "thai-leave-policy-vs",
  });
  console.log(`   vector store ID: ${vectorStore.id}`);

  const fileSearchTool = ToolUtility.createFileSearchTool([vectorStore.id]);

  console.log(">> Creating agent…");
  const agent = await client.createAgent(cfg.agentDeployment, {
    name: "thai-leave-policy-agent",
    instructions:
      "You are an HR assistant. Answer ONLY using the attached Thai leave policy document. Cite the relevant section if possible.",
    tools: [fileSearchTool.definition],
    toolResources: fileSearchTool.resources,
  });
  console.log(`   agent ID: ${agent.id}`);

  try {
    const thread = await client.threads.create();
    await client.messages.create(
      thread.id,
      "user",
      "How many days of annual leave is an employee entitled to, and what are the conditions?",
    );

    console.log(">> Running agent…");
    const run = await client.runs.createAndPoll(thread.id, agent.id, {
      pollingOptions: { intervalInMs: 2000 },
    });
    console.log(`   status=${run.status}`);
    if (run.status === "failed") {
      console.error("   error:", run.lastError);
      return;
    }

    const messages = await client.messages.list(thread.id, { order: "asc" });
    console.log("\n--- Conversation ---");
    for await (const m of messages) {
      const text = m.content.find((c) => c.type === "text");
      if (text) console.log(`[${m.role}] ${text.text.value}\n`);
    }
  } finally {
    console.log(">> Cleaning up agent + vector store + file…");
    await client.deleteAgent(agent.id).catch(() => {});
    await client.vectorStores.delete(vectorStore.id).catch(() => {});
    await client.files.delete(file.id).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
