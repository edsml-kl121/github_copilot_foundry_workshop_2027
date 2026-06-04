import { sendMessage } from "./api.js";
import { addMessage, formatForAPI } from "./chat.js";

let history = [];

function appendBubble(messagesEl, role, text, variant = "") {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${variant || (role === "user" ? "bubble-user" : "bubble-assistant")}`;
  bubble.textContent = text;
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}

function createLoading(messagesEl) {
  const loading = document.createElement("div");
  loading.className = "loading-indicator";
  loading.innerHTML = "<span></span><span></span><span></span>";
  messagesEl.appendChild(loading);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return loading;
}

async function waitUntilReady(messagesEl, inputEl, sendBtn) {
  let statusBubble = appendBubble(messagesEl, "assistant", "ระบบกำลังเตรียมพร้อม...", "bubble-status");

  for (;;) {
    try {
      const response = await fetch("/api/health");
      const payload = await response.json();
      if (payload.status === "ready") {
        statusBubble.textContent = "พร้อมรับคำถามแล้วครับ";
        inputEl.disabled = false;
        sendBtn.disabled = !inputEl.value.trim();
        return;
      }
    } catch {
      // Ignore transient polling errors and keep trying.
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const messages = document.getElementById("messages");

  input.disabled = true;
  sendBtn.disabled = true;

  input.addEventListener("input", () => {
    sendBtn.disabled = input.disabled || !input.value.trim();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = input.value.trim();
    if (!message) {
      return;
    }

    appendBubble(messages, "user", message);
    history = addMessage(history, "user", message);

    input.value = "";
    sendBtn.disabled = true;

    const loading = createLoading(messages);
    const result = await sendMessage(message, formatForAPI(history));
    loading.remove();

    if (result.reply) {
      appendBubble(messages, "assistant", result.reply);
      history = addMessage(history, "assistant", result.reply);
    } else {
      appendBubble(messages, "assistant", result.error || "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง");
    }

    sendBtn.disabled = input.disabled || !input.value.trim();
    input.focus();
  });

  await waitUntilReady(messages, input, sendBtn);
});
