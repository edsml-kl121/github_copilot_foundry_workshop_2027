export async function sendMessage(message, history = []) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, history }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return { error: payload.error || "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง" };
    }

    return { reply: payload.reply };
  } catch {
    return { error: "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง" };
  }
}
