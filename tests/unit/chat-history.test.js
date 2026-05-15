import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { validateChatRequest } = require('../../server/foundry.js')

// ── T007: validateChatRequest unit tests ─────────────────────────────────────
describe('validateChatRequest', () => {
  it('throws when message is empty string', () => {
    expect(() => validateChatRequest({ message: '', history: [] })).toThrow()
  })

  it('throws when message is blank whitespace', () => {
    expect(() => validateChatRequest({ message: '   ', history: [] })).toThrow()
  })

  it('throws when message exceeds 2000 characters', () => {
    const longMsg = 'ก'.repeat(2001)
    expect(() => validateChatRequest({ message: longMsg, history: [] })).toThrow()
  })

  it('throws when message field is missing', () => {
    expect(() => validateChatRequest({ history: [] })).toThrow()
  })

  it('throws when message is null', () => {
    expect(() => validateChatRequest({ message: null, history: [] })).toThrow()
  })

  it('throws when message is not a string', () => {
    expect(() => validateChatRequest({ message: 42, history: [] })).toThrow()
  })

  it('returns {message, history} for a valid minimal request', () => {
    const result = validateChatRequest({ message: 'ลาพักร้อน?', history: [] })
    expect(result).toEqual({ message: 'ลาพักร้อน?', history: [] })
  })

  it('trims whitespace from message', () => {
    const result = validateChatRequest({ message: '  hello  ', history: [] })
    expect(result.message).toBe('hello')
  })

  it('accepts message of exactly 2000 characters', () => {
    const msg = 'ก'.repeat(2000)
    const result = validateChatRequest({ message: msg, history: [] })
    expect(result.message).toBe(msg)
  })

  it('throws when history item has invalid role', () => {
    expect(() =>
      validateChatRequest({
        message: 'test',
        history: [{ role: 'system', content: 'hello' }],
      }),
    ).toThrow()
  })

  it('throws when history item has empty content', () => {
    expect(() =>
      validateChatRequest({
        message: 'test',
        history: [{ role: 'user', content: '' }],
      }),
    ).toThrow()
  })

  it('silently truncates history to 10 items', () => {
    const history = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `message ${i}`,
    }))
    const result = validateChatRequest({ message: 'test', history })
    expect(result.history.length).toBe(10)
  })
})

// ── T015: sliding-window unit tests ──────────────────────────────────────────
// These tests will FAIL until app/history.js is created (T016)
describe('history sliding window', () => {
  it('module can be imported', async () => {
    const mod = await import('../../app/history.js')
    expect(mod).toBeDefined()
  })

  it('MAX_TURNS equals 5', async () => {
    const { MAX_TURNS } = await import('../../app/history.js')
    expect(MAX_TURNS).toBe(5)
  })

  it('empty history returns empty array from getContextWindow', async () => {
    const { getContextWindow } = await import('../../app/history.js')
    expect(getContextWindow([])).toEqual([])
  })

  it('after 3 turns window contains 6 messages', async () => {
    const { appendMessage, getContextWindow } = await import('../../app/history.js')
    let history = []
    for (let i = 0; i < 3; i++) {
      history = appendMessage(history, 'user', `q${i}`)
      history = appendMessage(history, 'assistant', `a${i}`)
    }
    expect(getContextWindow(history).length).toBe(6)
  })

  it('after 5 turns window contains exactly 10 messages', async () => {
    const { appendMessage, getContextWindow } = await import('../../app/history.js')
    let history = []
    for (let i = 0; i < 5; i++) {
      history = appendMessage(history, 'user', `q${i}`)
      history = appendMessage(history, 'assistant', `a${i}`)
    }
    expect(getContextWindow(history).length).toBe(10)
  })

  it('after 6 turns oldest 2 messages are evicted and window still contains 10', async () => {
    const { appendMessage, getContextWindow } = await import('../../app/history.js')
    let history = []
    for (let i = 0; i < 6; i++) {
      history = appendMessage(history, 'user', `q${i}`)
      history = appendMessage(history, 'assistant', `a${i}`)
    }
    const window = getContextWindow(history)
    expect(window.length).toBe(10)
    // First turn (q0/a0) should be evicted
    expect(window[0].content).toBe('q1')
  })
})
