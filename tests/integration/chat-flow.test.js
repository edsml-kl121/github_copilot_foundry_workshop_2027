import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'node:module'

// ── T008: Integration test skeleton ─────────────────────────────────────────
// Skipped when FOUNDRY_API_KEY is not set (no credentials in test env)

const hasCredentials = !!process.env.FOUNDRY_API_KEY

describe.skipIf(!hasCredentials)('POST /api/chat — integration', () => {
  it('returns a reply for a valid Thai HR question', async () => {
    const require = createRequire(import.meta.url)
    const { createFoundryMiddleware } = require('../../server/foundry.js')
    const middleware = createFoundryMiddleware()

    const requestBody = JSON.stringify({
      message: 'ลาพักร้อนได้กี่วัน?',
      history: [],
    })

    // Create minimal mock req/res objects
    let responseBody = ''
    let statusCode = 0

    const req = {
      method: 'POST',
      url: '/chat',
      on: vi.fn((event, handler) => {
        if (event === 'data') handler(Buffer.from(requestBody))
        if (event === 'end') handler()
      }),
    }

    const res = {
      setHeader: vi.fn(),
      writeHead: vi.fn((code) => { statusCode = code }),
      end: vi.fn((body) => { responseBody = body }),
    }

    await new Promise((resolve) => {
      req.on = (event, handler) => {
        if (event === 'data') handler(Buffer.from(requestBody))
        if (event === 'end') handler()
        return req
      }
      middleware(req, res, resolve)
    })

    expect(statusCode).toBe(200)
    const parsed = JSON.parse(responseBody)
    expect(parsed).toHaveProperty('reply')
    expect(typeof parsed.reply).toBe('string')
    expect(parsed.reply.length).toBeGreaterThan(0)
  }, 60000)
})
