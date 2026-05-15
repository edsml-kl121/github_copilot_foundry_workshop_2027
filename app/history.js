// Sliding window conversation history utility
// Exported as ES module (used by app/main.js and Vitest)

export const MAX_TURNS = 5

/**
 * Appends a new message and enforces the sliding window (max MAX_TURNS * 2 messages).
 * Returns a NEW array (does not mutate the input).
 *
 * @param {Array<{role: string, content: string}>} history
 * @param {'user'|'assistant'} role
 * @param {string} content
 * @returns {Array<{role: string, content: string}>}
 */
export function appendMessage(history, role, content) {
  const next = [...history, { role, content }]
  return next.slice(-(MAX_TURNS * 2))
}

/**
 * Returns the last MAX_TURNS * 2 messages (the context window to send to the server).
 *
 * @param {Array<{role: string, content: string}>} history
 * @returns {Array<{role: string, content: string}>}
 */
export function getContextWindow(history) {
  return history.slice(-(MAX_TURNS * 2))
}
