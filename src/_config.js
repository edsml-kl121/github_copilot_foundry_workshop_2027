// Shared helpers: load .env and read required Foundry config.
"use strict";

const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

function required(name) {
  const v = process.env[name];
  if (!v || v.startsWith("YOUR-") || v === "replace-with-your-api-key") {
    throw new Error(
      `Missing or placeholder value for ${name}. ` +
        `Copy .env.template to .env and fill in real values.`,
    );
  }
  return v;
}

function getConfig() {
  const endpoint = required("FOUNDRY_ENDPOINT");
  return {
    endpoint: endpoint.endsWith("/") ? endpoint : endpoint + "/",
    apiKey: required("FOUNDRY_API_KEY"),
    projectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT, // only required by example 2
    apiVersion: process.env.FOUNDRY_API_VERSION || "2024-10-21",
    chatDeployment: process.env.FOUNDRY_DEPLOYMENT_CHAT || "gpt-4o-mini",
    agentDeployment: process.env.FOUNDRY_DEPLOYMENT_AGENT || "gpt-4o-mini",
    visionDeployment: process.env.FOUNDRY_DEPLOYMENT_VISION || "gpt-4o",
  };
}

module.exports = { getConfig, required };
