import { describe, expect, test } from "vitest";
import { getConfig } from "../../src/_config.js";
import { createRequire } from "node:module";

const { AzureOpenAI } = await import("openai");
const require = createRequire(import.meta.url);
const foundry = require("../../server/foundry.js");

const hasCreds =
  !!process.env.FOUNDRY_API_KEY &&
  !process.env.FOUNDRY_API_KEY.startsWith("YOUR-") &&
  process.env.FOUNDRY_API_KEY !== "replace-with-your-api-key";

describe("Foundry integration", () => {
  const run = hasCreds ? test : test.skip;

  run("roundtrip query returns text", async () => {

    const cfg = getConfig();
    const client = new AzureOpenAI({
      endpoint: cfg.endpoint,
      apiKey: cfg.apiKey,
      apiVersion: foundry.ASSISTANTS_API_VERSION,
    });

    const session = {
      fileId: null,
      vectorStoreId: null,
      assistantId: null,
    };

    try {
      const indexed = await foundry.uploadAndIndex(client);
      session.fileId = indexed.fileId;
      session.vectorStoreId = indexed.vectorStoreId;

      const agent = await foundry.createAgent(client, session.vectorStoreId);
      session.assistantId = agent.assistantId;

      const reply = await foundry.query(client, session.assistantId, "ลาป่วยได้กี่วัน", []);
      expect(typeof reply).toBe("string");
      expect(reply.length).toBeGreaterThan(0);
    } finally {
      await foundry.cleanup(client, session);
    }
  }, 120000);
});
