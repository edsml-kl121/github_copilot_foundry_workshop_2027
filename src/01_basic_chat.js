// Example 1 — Basic Microsoft Foundry chat completion.
//
// Uses Azure OpenAI–compatible chat completions on your Foundry resource
// to run a multi-turn user/assistant conversation.
//
// Run:  npm run example:1
"use strict";

const { AzureOpenAI } = require("openai");
const { getConfig } = require("./_config");

async function main() {
  const cfg = getConfig();
  console.log(`>> Using deployment: ${cfg.chatDeployment}`);

  const client = new AzureOpenAI({
    endpoint: cfg.endpoint,
    apiKey: cfg.apiKey,
    apiVersion: cfg.apiVersion,
    deployment: cfg.chatDeployment,
  });

  const response = await client.chat.completions.create({
    model: cfg.chatDeployment,
    temperature: 0.2,
    max_tokens: 200,
    messages: [
      { role: "system", content: "You are a concise, helpful assistant." },
      { role: "user", content: "In one sentence, what is Microsoft Foundry?" },
      {
        role: "assistant",
        content:
          "It is Microsoft's unified platform for building, deploying, and managing AI agents and models.",
      },
      {
        role: "user",
        content: "Great. Now name three core capabilities as a bulleted list.",
      },
    ],
  });

  console.log("\n--- Assistant ---");
  console.log(response.choices[0].message.content);
  console.log("\nUsage:", response.usage);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
