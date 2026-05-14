// Example 3 — Vision: send data/image.png to a Foundry-hosted multimodal
// model via Azure OpenAI chat completions.
//
// Run:  npm run example:3
"use strict";

const fs = require("fs");
const path = require("path");
const { AzureOpenAI } = require("openai");
const { getConfig } = require("./_config");

const IMAGE_PATH = path.resolve(__dirname, "..", "data", "image.png");

function toDataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : "image/png";
  const b64 = fs.readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${b64}`;
}

async function main() {
  const cfg = getConfig();

  if (!fs.existsSync(IMAGE_PATH)) {
    throw new Error(`Expected image at ${IMAGE_PATH}`);
  }

  console.log(`>> Using deployment: ${cfg.visionDeployment}`);

  const client = new AzureOpenAI({
    endpoint: cfg.endpoint,
    apiKey: cfg.apiKey,
    apiVersion: cfg.apiVersion,
    deployment: cfg.visionDeployment,
  });

  const response = await client.chat.completions.create({
    model: cfg.visionDeployment,
    temperature: 0.2,
    max_tokens: 400,
    messages: [
      { role: "system", content: "You are a careful image analyst." },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe this image in 3 short bullet points. If there is text, transcribe it.",
          },
          {
            type: "image_url",
            image_url: { url: toDataUrl(IMAGE_PATH), detail: "high" },
          },
        ],
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
