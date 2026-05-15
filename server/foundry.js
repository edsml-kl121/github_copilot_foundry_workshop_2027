'use strict'

const fs = require('fs')
const path = require('path')
const { AzureOpenAI } = require('openai')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

// ── Named constants (no magic numbers) ──────────────────────────────────────
const MAX_HISTORY_MESSAGES = 10
const MAX_MESSAGE_LENGTH = 2000
const AGENT_RUN_TIMEOUT_MS = 30000
const PDF_PATH = path.resolve(__dirname, '..', 'data', 'thai_leave_policy.pdf')
const SYSTEM_PROMPT =
  'คุณคือผู้ช่วย HR ของ MOF HR แชท ซึ่งให้บริการตอบคำถามเกี่ยวกับนโยบาย HR ของกระทรวงการคลัง ' +
  'กรุณาตอบด้วยภาษาไทยแบบกึ่งทางการเท่านั้น (ไม่ทางการจนเกินไปและไม่ลำลองจนเกินไป) ' +
  'ตอบโดยอ้างอิงจากเอกสารที่แนบมาเท่านั้น ' +
  'หากไม่พบข้อมูลในเอกสาร ให้แจ้งว่าไม่พบข้อมูลและแนะนำให้ติดต่อฝ่าย HR โดยตรง'

// ── Singleton agent context ──────────────────────────────────────────────────
let ctx = null

// ── Agent initialisation ─────────────────────────────────────────────────────
async function ensureAgent() {
  if (ctx && ctx.initialized) return ctx

  const endpoint = process.env.FOUNDRY_ENDPOINT
  const apiKey = process.env.FOUNDRY_API_KEY
  if (!endpoint) throw new Error('FOUNDRY_ENDPOINT is not set in .env')
  if (!apiKey) throw new Error('FOUNDRY_API_KEY is not set in .env')

  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`Expected PDF at ${PDF_PATH}`)
  }

  const agentDeployment = process.env.FOUNDRY_DEPLOYMENT_AGENT || 'gpt-4o-mini'
  // Assistants v2 requires a preview API version; stable versions don't support it
  const apiVersion = '2025-01-01-preview'

  const client = new AzureOpenAI({ endpoint, apiKey, apiVersion })

  console.error('>> Uploading PDF...')
  const file = await client.files.create({
    file: fs.createReadStream(PDF_PATH),
    purpose: 'assistants',
  })
  console.error(`   file ID: ${file.id}`)

  console.error('>> Creating vector store...')
  const vectorStore = await client.vectorStores.create({ name: 'mof-hr-vs' })
  console.error(`   vector store ID: ${vectorStore.id}`)

  console.error('>> Adding PDF to vector store (polling until ready)...')
  await client.vectorStores.fileBatches.createAndPoll(vectorStore.id, {
    file_ids: [file.id],
  })
  console.error('   vector store ready')

  console.error('>> Creating assistant...')
  const assistant = await client.beta.assistants.create({
    name: 'mof-hr-agent',
    instructions: SYSTEM_PROMPT,
    model: agentDeployment,
    tools: [{ type: 'file_search' }],
    tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
  })
  console.error(`   assistant ID: ${assistant.id}`)

  ctx = {
    client,
    assistantId: assistant.id,
    vectorStoreId: vectorStore.id,
    fileId: file.id,
    initialized: true,
  }

  return ctx
}

// ── Request validation ───────────────────────────────────────────────────────
function validateChatRequest(body) {
  if (!body || typeof body !== 'object') {
    throw 'Request body must be a JSON object'
  }

  const { message, history } = body

  if (message === undefined || message === null) {
    throw 'message field is required and must be a non-empty string'
  }
  if (typeof message !== 'string') {
    throw 'message field is required and must be a non-empty string'
  }
  if (message.trim().length === 0) {
    throw 'message field is required and must be a non-empty string'
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw `message must not exceed ${MAX_MESSAGE_LENGTH} characters`
  }

  const validatedHistory = []
  if (history !== undefined) {
    if (!Array.isArray(history)) {
      throw 'history must be an array'
    }
    const allowed = new Set(['user', 'assistant'])
    for (const item of history) {
      if (!item || typeof item !== 'object') {
        throw 'Each history item must be an object with role and content'
      }
      if (!allowed.has(item.role)) {
        throw 'Each history item role must be "user" or "assistant"'
      }
      if (!item.content || typeof item.content !== 'string' || item.content.trim().length === 0) {
        throw 'Each history item must have a non-empty content string'
      }
      validatedHistory.push({ role: item.role, content: item.content })
    }
  }

  const trimmedHistory = validatedHistory.slice(-MAX_HISTORY_MESSAGES)
  return { message: message.trim(), history: trimmedHistory }
}

// ── Health handler ───────────────────────────────────────────────────────────
async function handleHealth(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(200)
  res.end(JSON.stringify({ status: 'ok', agentReady: ctx && ctx.initialized ? true : false }))
}

// ── Chat handler ─────────────────────────────────────────────────────────────
async function handleChat(req, res) {
  try {
    const rawBody = await new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })

    let body
    try {
      body = JSON.parse(rawBody)
    } catch {
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(400)
      res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      return
    }

    let validated
    try {
      validated = validateChatRequest(body)
    } catch (validationError) {
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(400)
      res.end(JSON.stringify({ error: validationError }))
      return
    }

    const { message, history } = validated

    let agentCtx
    try {
      agentCtx = await ensureAgent()
    } catch (initError) {
      console.error('Agent init error:', initError)
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(503)
      res.end(JSON.stringify({ error: 'HR agent is initialising, please retry in a moment' }))
      return
    }

    const { client, assistantId } = agentCtx

    // Create thread with full conversation history + current message
    const thread = await client.beta.threads.create({
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    })

    // Run the assistant with timeout
    let run
    try {
      run = await Promise.race([
        client.beta.threads.runs.createAndPoll(thread.id, { assistant_id: assistantId }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), AGENT_RUN_TIMEOUT_MS),
        ),
      ])
    } catch (runError) {
      if (runError.message === 'TIMEOUT') {
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(504)
        res.end(
          JSON.stringify({ error: 'The agent did not respond within 30 seconds. Please try again.' }),
        )
      } else {
        console.error('Agent run error:', runError)
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(500)
        res.end(JSON.stringify({ error: 'An unexpected error occurred. Please contact the IT team.' }))
      }
      return
    }

    if (run.status === 'failed') {
      console.error('Run failed:', run.last_error)
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(500)
      res.end(JSON.stringify({ error: 'An unexpected error occurred. Please contact the IT team.' }))
      return
    }

    // Extract the last assistant message
    const messages = await client.beta.threads.messages.list(thread.id, { order: 'asc' })
    let reply = ''
    for (const m of messages.data) {
      if (m.role === 'assistant') {
        const textContent = m.content.find((c) => c.type === 'text')
        if (textContent) {
          reply = textContent.text.value
        }
      }
    }

    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify({ reply }))
  } catch (unexpectedError) {
    console.error('Unexpected error in handleChat:', unexpectedError)
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(500)
    res.end(JSON.stringify({ error: 'An unexpected error occurred. Please contact the IT team.' }))
  }
}

// ── Middleware factory ───────────────────────────────────────────────────────
function createFoundryMiddleware() {
  return async function middleware(req, res, next) {
    const url = req.url ? req.url.split('?')[0] : ''

    if (req.method === 'GET' && url === '/health') {
      return handleHealth(req, res)
    }

    if (req.method === 'POST' && url === '/chat') {
      return handleChat(req, res)
    }

    next()
  }
}

// ── Graceful shutdown ────────────────────────────────────────────────────────
async function cleanup() {
  if (!ctx || !ctx.initialized) {
    process.exit(0)
  }
  const { client, assistantId, vectorStoreId, fileId } = ctx
  await client.beta.assistants.del(assistantId).catch(() => {})
  await client.vectorStores.del(vectorStoreId).catch(() => {})
  await client.files.del(fileId).catch(() => {})
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

module.exports = { createFoundryMiddleware, validateChatRequest }
