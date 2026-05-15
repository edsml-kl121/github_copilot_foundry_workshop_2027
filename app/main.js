import { appendMessage, getContextWindow } from './history.js'

// ── State ─────────────────────────────────────────────────────────────────────
let history = []

// ── DOM refs ──────────────────────────────────────────────────────────────────
const messagesEl = document.getElementById('messages')
const inputEl = document.getElementById('input')
const sendBtn = document.getElementById('send-btn')
const introEl = document.getElementById('intro')
const suggestionEls = document.querySelectorAll('[data-prompt]')

// ── Helpers ───────────────────────────────────────────────────────────────────

function appendMessageToDOM(role, text) {
  if (introEl) {
    introEl.hidden = true
  }

  const div = document.createElement('div')
  div.className = `message ${role}`
  div.textContent = text
  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
  return div
}

function setInputEnabled(enabled) {
  inputEl.disabled = !enabled
  sendBtn.disabled = !enabled
}

function showTypingIndicator() {
  const div = document.createElement('div')
  div.className = 'message assistant typing'
  div.id = 'typing-indicator'
  div.textContent = '…'
  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
  return div
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator')
  if (indicator) indicator.remove()
}

// ── Health polling ────────────────────────────────────────────────────────────

const HEALTH_POLL_INTERVAL_MS = 2000

function startHealthPolling() {
  const statusMsg = document.createElement('div')
  statusMsg.className = 'message assistant typing'
  statusMsg.id = 'boot-status'
  statusMsg.textContent = 'กำลังเชื่อมต่อระบบ…'
  messagesEl.appendChild(statusMsg)

  const poll = setInterval(async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) {
        clearInterval(poll)
        statusMsg.remove()
        setInputEnabled(true)
        inputEl.focus()
      }
    } catch {
      // Network not ready yet — keep polling silently
    }
  }, HEALTH_POLL_INTERVAL_MS)
}

// ── Send message ──────────────────────────────────────────────────────────────

async function sendMessage() {
  const text = inputEl.value.trim()
  if (!text) return

  inputEl.value = ''
  setInputEnabled(false)
  appendMessageToDOM('user', text)
  const typingEl = showTypingIndicator()

  const contextHistory = getContextWindow(history)

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: contextHistory }),
    })

    removeTypingIndicator()

    if (res.ok) {
      const data = await res.json()
      const reply = data.reply || ''
      appendMessageToDOM('assistant', reply)
      history = appendMessage(history, 'user', text)
      history = appendMessage(history, 'assistant', reply)
    } else {
      const data = await res.json().catch(() => ({}))
      const errorText = data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
      appendMessageToDOM('assistant', `⚠️ ${errorText}`)
    }
  } catch {
    removeTypingIndicator()
    appendMessageToDOM('assistant', '⚠️ ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง')
  } finally {
    setInputEnabled(true)
    inputEl.focus()
    void typingEl // already removed above
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────

sendBtn.addEventListener('click', sendMessage)

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

// Auto-resize textarea
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto'
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 128)}px`
})

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', startHealthPolling)
