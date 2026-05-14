# Microsoft Foundry — Workshop Template

A copy-paste-ready Node.js project with three end-to-end examples against a
**Microsoft Foundry** (Azure AI Foundry / `AIServices`) resource.

```
workshop/
├── .env.template            # copy → .env, fill in your team's values
├── package.json
├── data/
│   ├── thai_leave_policy.pdf  # used by example 2 (file search)
│   └── image.png              # used by example 3 (vision)
└── src/
    ├── _config.js          # loads .env + validates required vars
    ├── 01_basic_chat.js    # multi-turn user/assistant chat
    ├── 02_file_search.js   # Foundry agent + file search on a PDF
    └── 03_image.js         # vision (image → description)
```

## 1. Setup (once)

```bash
cd workshop
cp .env.template .env
# then open .env and paste your team's values
npm install
```

Your team lead will give you a credentials block that looks like:

```
[Team 3] mof-foundry-team3-mo7gki7uyi6aa
  Region:           westus3
  Endpoint:         https://...cognitiveservices.azure.com/
  AOAI Endpoint:    https://mof-foundry-team3-mo7gki7uyi6aa.openai.azure.com/
  Project:          team3-project
  Project Endpoint: https://mof-foundry-team3-mo7gki7uyi6aa.services.ai.azure.com/api/projects/team3-project
  API Key 1:        <key>
  ...
```

Map those into `.env` like so:

| `.env` variable             | Value from credentials block |
|-----------------------------|------------------------------|
| `FOUNDRY_ENDPOINT`          | the **AOAI Endpoint** line   |
| `FOUNDRY_API_KEY`           | **API Key 1** (or Key 2)     |
| `FOUNDRY_PROJECT_ENDPOINT`  | the **Project Endpoint** line (only needed for example 2) |

The deployment names default to `gpt-4o-mini` (chat/agent) and `gpt-4o` (vision)
— change `FOUNDRY_DEPLOYMENT_*` in `.env` if your resource uses different names
(e.g. `gpt-5`, `gpt-5-mini`).

## 2. Run the examples

```bash
npm run example:1   # basic chat completion (user/assistant messages)
npm run example:2   # agent + file search on data/thai_leave_policy.pdf
npm run example:3   # vision on data/image.png
```

Or directly:
```bash
node src/01_basic_chat.js
node src/02_file_search.js
node src/03_image.js
```

## Authentication notes

- Examples **1** and **3** use the API key from `.env`.
- Example **2** uses the project endpoint + `DefaultAzureCredential`, so you
  must `az login` first. Your signed-in identity needs the **Azure AI User**
  role (or higher) on the Foundry project. Replace your own data files in
  `data/` to try other PDFs / images.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Missing or placeholder value for FOUNDRY_*` | You didn't copy `.env.template` to `.env` or didn't replace the placeholder. |
| `401 Unauthorized` on examples 1/3 | Wrong `FOUNDRY_API_KEY`, or it's tied to a different Foundry resource than `FOUNDRY_ENDPOINT`. |
| `403 Forbidden` on example 2 | You're logged in (`az login`) but lack `Azure AI User` on the project. |
| `DeploymentNotFound` | `FOUNDRY_DEPLOYMENT_*` doesn't match a deployment that exists on your resource. |
| Example 2 hangs | First-time vector store ingestion can take ~30s for a multi-page PDF — wait it out. |
