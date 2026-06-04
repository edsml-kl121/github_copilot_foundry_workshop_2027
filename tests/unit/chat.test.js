import { describe, expect, it } from "vitest";
import { addMessage, formatForAPI, trimHistory } from "../../app/chat.js";

describe("chat helpers", () => {
  it("addMessage adds a message without mutating original array", () => {
    const before = [{ role: "user", content: "hello", timestamp: new Date() }];
    const copy = [...before];

    const after = addMessage(before, "assistant", "world");

    expect(before).toEqual(copy);
    expect(after).toHaveLength(2);
    expect(after[1].role).toBe("assistant");
    expect(after[1].content).toBe("world");
    expect(after[1].timestamp).toBeInstanceOf(Date);
  });

  it("addMessage trims to 10 items", () => {
    const base = Array.from({ length: 10 }).map((_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `m-${i}`,
      timestamp: new Date(),
    }));

    const trimmed = addMessage(base, "user", "latest");

    expect(trimmed).toHaveLength(10);
    expect(trimmed[0].content).toBe("m-1");
    expect(trimmed[9].content).toBe("latest");
  });

  it("trimHistory returns last N items", () => {
    const items = [1, 2, 3, 4, 5].map((n) => ({
      role: "user",
      content: String(n),
      timestamp: new Date(),
    }));

    const lastTwo = trimHistory(items, 2);

    expect(lastTwo.map((x) => x.content)).toEqual(["4", "5"]);
  });

  it("formatForAPI strips timestamps", () => {
    const items = [
      { role: "user", content: "a", timestamp: new Date() },
      { role: "assistant", content: "b", timestamp: new Date() },
    ];

    const apiPayload = formatForAPI(items);

    expect(apiPayload).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
    ]);
  });
});
